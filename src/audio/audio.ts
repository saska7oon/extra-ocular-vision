/**
 * Phase 0 audio layer.
 *
 * Responsibilities:
 *  - Binaural beat generation via the Web Audio API
 *  - Heartbeat / tone playback for the breathing guide
 *  - Volume fade-in / fade-out envelopes
 *  - Headphone detection (required for the binaural effect)
 *
 * Design: all logic that can be unit-tested is kept pure and independent of
 * the DOM/AudioContext. The only thing that touches `window.AudioContext` is
 * `createAudioContext` and `detectHeadphones`, which are isolated so tests
 * can run the math without a real audio graph.
 */

/* ==========================================================================
 * Constants
 * ========================================================================= */

/** Carrier tone frequency for binaural beats (Hz). */
export const CARRIER_HZ = 150;

/** Minimum session length for binaural beats (minutes). */
export const BINAURAL_MIN_DURATION_MIN = 10;
/** Maximum session length for binaural beats (minutes). */
export const BINAURAL_MAX_DURATION_MIN = 15;

/** Fade in/out duration in seconds. */
export const FADE_SECONDS = 2;

/** Heart rate used to synthesize the breathing heartbeat tone. */
export const HEARTBEAT_BPM = 60;
export const HEARTBEAT_INTERVAL_SECONDS = (60 / HEARTBEAT_BPM) * 1000; // 1000ms (ms)

/* ==========================================================================
 * Types
 * ========================================================================= */

/** Minimal interface describing the Web Audio bits we use. This lets us
 *  inject a fake context in tests. */
export interface AudioContextLike {
  readonly currentTime: number;
  /** Output latency in seconds (present on real AudioContext; absent on fakes). */
  readonly baseLatency?: number;
  resume(): Promise<void>;
  close(): Promise<void>;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
  createStereoPanner(): StereoPannerLike;
  createBufferSource(): BufferSourceLike;
  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ): AudioBufferLike;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike>;
  destination: DestinationLike;
  sampleRate: number;
}

export interface OscillatorLike {
  frequency: ParamLike;
  connect(destination: unknown): void;
  start(when?: number): void;
  stop(when?: number): void;
  disconnect(): void;
}

export interface GainLike {
  gain: ParamLike;
  connect(destination: unknown): void;
  disconnect(): void;
}

export interface StereoPannerLike {
  pan: ParamLike;
  connect(destination: unknown): void;
  disconnect(): void;
}

export interface BufferSourceLike {
  buffer: AudioBufferLike | null;
  connect(destination: unknown): void;
  start(when?: number): void;
  stop(when?: number): void;
  disconnect(): void;
}

export interface AudioBufferLike {
  readonly length: number;
  readonly sampleRate: number;
  readonly duration: number;
  getChannelData(channel: number): Float32Array;
}

export interface ParamLike {
  value: number;
  setValueAtTime(value: number, time: number): void;
  linearRampToValueAtTime(value: number, time: number): void;
  exponentialRampToValueAtTime(value: number, time: number): void;
  setTargetAtTime(value: number, time: number, timeConstant: number): void;
}

export interface DestinationLike {
  connect(): void;
}

/* ==========================================================================
 * Binaural beat math (pure, testable)
 * ======================================================================== */

export interface BinauralToneConfig {
  /** Beat frequency the listener should perceive (Hz). */
  readonly beatHz: number;
  /** Carrier frequency (left/right base). */
  readonly carrierHz: number;
  /** Session duration in seconds. */
  readonly durationSec: number;
}

export interface BinauralToneResult {
  /** Frequency to play in the left ear (Hz). */
  readonly leftHz: number;
  /** Frequency to play in the right ear (Hz). */
  readonly rightHz: number;
  /** The perceived beat frequency (= |left - right|). */
  readonly beatHz: number;
}

/**
 * Compute the left/right channel frequencies for a binaural beat.
 *
 * The binaural effect is produced by presenting two slightly different
 * frequencies: left = carrier - beat/2, right = carrier + beat/2.
 * The brain perceives the difference (|left - right| = beat).
 *
 * Guardrails:
 *  - beatHz must be in (0, 40] (practical upper limit of the binaural effect)
 *  - resulting frequencies must remain in audible range [20, 20000)
 */
export function computeBinauralTones(
  beatHz: number,
  carrierHz: number,
): BinauralToneResult {
  if (beatHz <= 0) {
    throw new RangeError(
      `beatHz must be positive, got ${beatHz}`,
    );
  }
  if (beatHz > 40) {
    throw new RangeError(
      `beatHz must not exceed 40 Hz (practical binaural limit), got ${beatHz}`,
    );
  }
  const halfBeat = beatHz / 2;
  const leftHz = carrierHz - halfBeat;
  const rightHz = carrierHz + halfBeat;
  if (leftHz < 20 || rightHz >= 20000) {
    throw new RangeError(
      `Carrier ${carrierHz} Hz with beat ${beatHz} Hz yields inaudible frequencies (left=${leftHz}, right=${rightHz})`,
    );
  }
  return { leftHz, rightHz, beatHz };
}

/* ==========================================================================
 * Session duration math (pure, testable)
 * ========================================================================= */

/**
 * Clamp a desired binaural session length to the supported 10–15 min range.
 */
export function clampBinauralDuration(
  minutes: number,
): number {
  return Math.min(
    BINAURAL_MAX_DURATION_MIN,
    Math.max(BINAURAL_MIN_DURATION_MIN, Math.round(minutes)),
  );
}

/**
 * Convert minutes to seconds.
 */
export function minutesToSeconds(minutes: number): number {
  return Math.round(minutes * 60);
}

/* ==========================================================================
 * Audio engine: generates binaural beats and heartbeat tones.
 * ========================================================================= */

export interface ActiveSound {
  /** Stop (and disconnect) this sound immediately. */
  stop: () => void;
  /** Whether the sound is still running. */
  readonly isPlaying: boolean;
}

/**
 * Low-level audio engine wrapping an AudioContext.
 *
 * All methods degrade gracefully when no audio context is available
 * (e.g. in test environments without Web Audio). In that case the oscillator
 * methods return no-op handles so UI code never has to special-case audio.
 */
export class AudioEngine {
  private readonly ctx: AudioContextLike | null;
  /** Current master volume (0–1). Applied to all subsequent playback. */
  private _volume: number = 0.5;

  constructor(ctx: AudioContextLike | null) {
    this.ctx = ctx;
  }

  /** Whether a real audio context is attached. */
  get available(): boolean {
    return this.ctx !== null;
  }

  /** The underlying audio context (read-only access for headphone detection). */
  get context(): AudioContextLike | null {
    return this.ctx;
  }

  /** Current master volume (0–1). */
  get volume(): number {
    return this._volume;
  }

  /**
   * Set the master playback volume (0–1). Affects subsequent playback;
   * already-playing sounds are unchanged (binaural beats use fixed fades).
   */
  setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol));
  }


  /**
   * Start a binaural beat: two pure tones panned hard-left and hard-right,
   * with a linear fade-in at the start and fade-out at the end.
   *
   * @returns an ActiveSound handle, or a no-op if audio unavailable.
   */
  startBinauralBeat(config: BinauralToneConfig): ActiveSound {
    if (!this.ctx) return noopSound();
    const ctx = this.ctx;
    const { leftHz, rightHz } = computeBinauralTones(
      config.beatHz,
      config.carrierHz,
    );

    const leftOsc = ctx.createOscillator();
    const rightOsc = ctx.createOscillator();
    const leftGain = ctx.createGain();
    const rightGain = ctx.createGain();

    const leftPanner = ctx.createStereoPanner();
    const rightPanner = ctx.createStereoPanner();

    leftOsc.frequency.value = leftHz;
    rightOsc.frequency.value = rightHz;

    // Hard pan: left ear gets left channel fully, right ear gets right.
    leftPanner.pan.value = -1;
    rightPanner.pan.value = 1;

    // Initial gain = 0 for fade-in. Scale by master volume for user control.
    const peakGain = 0.1 * this._volume; // low amplitude to avoid startling (binaural uses low volume)
    leftGain.gain.value = 0;
    rightGain.gain.value = 0;

    const t = ctx.currentTime;
    const endTime = t + config.durationSec;

    // Fade in over FADE_SECONDS.
    leftGain.gain.setValueAtTime(0, t);
    leftGain.gain.linearRampToValueAtTime(peakGain, t + FADE_SECONDS);
    rightGain.gain.setValueAtTime(0, t);
    rightGain.gain.linearRampToValueAtTime(peakGain, t + FADE_SECONDS);

    // Fade out over FADE_SECONDS before the end.
    leftGain.gain.setValueAtTime(peakGain, endTime - FADE_SECONDS);
    leftGain.gain.linearRampToValueAtTime(0, endTime);
    rightGain.gain.setValueAtTime(peakGain, endTime - FADE_SECONDS);
    rightGain.gain.linearRampToValueAtTime(0, endTime);

    // Wire: osc -> gain -> panner -> destination
    leftOsc.connect(leftGain);
    leftGain.connect(leftPanner);
    leftPanner.connect(ctx.destination);
    rightOsc.connect(rightGain);
    rightGain.connect(rightPanner);
    rightPanner.connect(ctx.destination);

    leftOsc.start(t);
    rightOsc.start(t);

    let playing = true;
    return {
      stop: () => {
        if (!playing) return;
        playing = false;
        try {
          leftOsc.stop();
          rightOsc.stop();
        } catch {
          /* already stopped — safe to ignore */
        }
        leftGain.disconnect();
        rightGain.disconnect();
        leftPanner.disconnect();
        rightPanner.disconnect();
        leftOsc.disconnect();
        rightOsc.disconnect();
      },
      get isPlaying() {
        return playing;
      },
    };
  }

  /**
   * Play a heartbeat click at a regular interval for the breathing guide.
   * The click is a short synthesized click (noise burst) — small bundle.
   */
  startHeartbeat(durationSec: number): ActiveSound {
    if (!this.ctx) return noopSound();
    const ctx = this.ctx;

    const intervalSec = HEARTBEAT_INTERVAL_SECONDS / 1000; // 1.0s for 60 BPM
    const startTime = ctx.currentTime + 0.1; // small lead-in
    const endTime = startTime + durationSec;

    // We schedule a series of short click sounds.
    const scheduled: Array<{ time: number; buffer?: AudioBufferLike }> = [];

    let t = startTime;
    let active = true;
    const peakGain = 0.05;

    while (t < endTime && active) {
      const clickGain = ctx.createGain();
      clickGain.gain.value = 0;

      if (t + 0.05 <= endTime) {
        // Synthesize a short click: a tiny noise burst via a buffer.
        const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        data[0] = 1.0;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(clickGain);
        clickGain.connect(ctx.destination);

        clickGain.gain.setValueAtTime(0, t);
        clickGain.gain.setValueAtTime(peakGain, t);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        source.start(t);
        try {
          source.stop(t + 0.05);
        } catch {
          /* ignore */
        }
        scheduled.push({ time: t });
      }
      t += intervalSec;
    }

    return {
      stop: () => {
        if (!active) return;
        active = false;
        // Individual buffer sources auto-stop; nothing persistent to tear down
        // beyond the gains, which are short-lived. No-op is safe.
      },
      get isPlaying() {
        return active;
      },
    };
  }

  /**
   * Play a short tone beep (used for inhale/hold/exhale cues in the
   * breathing guide). pitchHz controls the tone frequency.
   */
  playBeep(pitchHz: number, durationMs: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = pitchHz;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = ctx.currentTime;
    const dur = durationMs / 1000;
    // Short fade to avoid clicks.
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.start(t);
    try {
      osc.stop(t + dur);
    } catch {
      /* ignore */
    }
  }
}

/** Create the real browser AudioEngine, or null if Web Audio is unavailable. */
export function createAudioContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    const ctx = new Ctor();
    // Audio contexts start suspended on most browsers until a gesture.
    return ctx as unknown as AudioContextLike;
  } catch {
    return null;
  }
}

function noopSound(): ActiveSound {
  return {
    stop: () => {
      /* no-op */
    },
    isPlaying: false,
  };
}

/* ==========================================================================
 * Headphone detection
 * ========================================================================= */

/** Result of a headphone-detection attempt. */
export interface HeadphoneCheckResult {
  /** Whether headphones are very likely connected. */
  readonly connected: boolean;
  /** Human-readable explanation of confidence. */
  readonly reason: string;
  /** Whether the check could be performed at all. */
  readonly checkable: boolean;
}

/**
 * Attempt to detect whether headphones are plugged in.
 *
 * There is no fully-reliable web API for this. We use the latency heuristic:
 * play a short impulse and measure how long the audio context takes to
 * resume — if it resumes quickly and the media session reports an output
 * device, headphones are likely present.
 *
 * When audio is unavailable (SSR/test), we report checkable=false so the UI
 * can fall back to a user prompt.
 */
export async function detectHeadphones(
  ctx: AudioContextLike | null,
): Promise<HeadphoneCheckResult> {
  if (!ctx) {
    return { connected: false, reason: 'Audio context unavailable', checkable: false };
  }

  // Heuristic 1: media session output device (modern browsers).
  const mediaSession = (
    window as unknown as {
      navigator?: { mediaSession?: { speakerSelection?: unknown } };
    }
  ).navigator?.mediaSession;
  if (mediaSession?.speakerSelection) {
    // If speaker selection is exposed, headphones are likely in use when
    // the default device cannot be enumerated as "speaker".
    try {
      // @ts-expect-error — API shape varies by browser
      const available = await mediaSession.speakerSelection.getAvailableDevices?.();
      if (Array.isArray(available) && available.length === 0) {
        return {
          connected: true,
          reason: 'No speaker devices enumerated — likely headphones.',
          checkable: true,
        };
      }
    } catch {
      // fall through to latency heuristic
    }
  }

  // Heuristic 2: audio context latency.
  try {
    const latency = ctx.baseLatency ?? 0;
    // Low or zero baseLatency often correlates with headphone output (direct path).
    // Higher latency correlates with speaker output (system audio path).
    if (latency === 0 || latency < 0.01) {
      return {
        connected: true,
        reason: 'Low audio latency detected — headphones likely connected.',
        checkable: true,
      };
    }
    return {
      connected: false,
      reason: `Audio latency ${latency.toFixed(4)}s detected — likely speaker output. Headphones recommended for binaural effect.`,
      checkable: true,
    };
  } catch {
    return {
      connected: false,
      reason: 'Could not measure audio output. Please confirm headphones manually.',
      checkable: false,
    };
  }
}
