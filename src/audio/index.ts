/**
 * Audio layer barrel export for Extra-Ocular Vision.
 *
 * Web Audio API-based binaural beat generation, heartbeat tones, and
 * headphone detection. All real audio logic lives in audio.ts; this
 * module re-exports the public surface.
 */
export {
  CARRIER_HZ,
  BINAURAL_MIN_DURATION_MIN,
  BINAURAL_MAX_DURATION_MIN,
  FADE_SECONDS,
  HEARTBEAT_BPM,
  HEARTBEAT_INTERVAL_SECONDS,
  computeBinauralTones,
  clampBinauralDuration,
  minutesToSeconds,
  AudioEngine,
  createAudioContext,
  detectHeadphones,
  type AudioContextLike,
  type ActiveSound,
  type BinauralToneConfig,
  type BinauralToneResult,
  type HeadphoneCheckResult,
  type OscillatorLike,
  type GainLike,
  type StereoPannerLike,
  type BufferSourceLike,
  type AudioBufferLike,
  type ParamLike,
  type DestinationLike,
} from './audio';
