/**
 * Tutorial — animated, interactive tutorials for each modality.
 * Features step-by-step presentation with animations, diagrams, and interactive demos.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactElement } from 'react';
import { Button, Card } from '../ui';
import {
  TUTORIAL_CATEGORIES,
  type TutorialSlide,
  getTutorialCategory,
  getTutorialSection,
} from '../features/tutorials';
import { ForcedChoiceSession, ShapeIcon } from './ForcedChoiceSession';
import { BreathingGuide } from './BreathingGuide';
import { BinauralPlayer } from './BinauralPlayer';
import { FORCED_CHOICE_CONFIGS } from '../features/exercises';

interface TutorialProps {
  profileId: string;
  absoluteDay: number;
  onSessionComplete?: (record: unknown) => void;
  initialCategory?: string;
  initialSection?: string;
}

type View = 'categories' | 'section' | 'slide';

interface TutorialState {
  view: View;
  categoryId: string | null;
  sectionId: string | null;
  slideIndex: number;
  completedSlides: Set<string>;
}

/** Parses markdown-like content to proper React elements */
function FormattedContent({ content }: { content: string }): ReactElement {
  const parseContent = (text: string) => {
    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');
    let inList = false;
    let listItems: string[] = [];
    let listType: 'bullet' | 'numbered' | null = null;
    let inTable = false;
    let tableRows: string[][] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="tutorial-list">
            {listItems.map((item, i) => (
              <li key={i} className="tutorial-list-item">{parseInline(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
        listType = null;
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0 && tableRows[0]) {
        elements.push(
          <table key={`table-${elements.length}`} className="tutorial-table">
            <thead>
              <tr>{tableRows[0].map((cell, i) => <th key={i}>{parseInline(cell)}</th>)}</tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j}>{parseInline(cell)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        );
        tableRows = [];
      }
    };

    const parseInline = (text: string): React.ReactNode => {
      return text
        .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/)
        .filter(Boolean)
        .map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i}>{part.slice(1, -1)}</code>;
          }
          return <span key={i}>{part}</span>;
        });
    };

    for (const line of lines) {
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        flushList();
        flushTable();
        continue;
      }

      // Table rows
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushList();
        const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
        // Skip separator row
        if (!cells.every(c => c.match(/^-+$/))) {
          tableRows.push(cells);
        }
        inTable = true;
        continue;
      } else if (inTable) {
        flushTable();
        inTable = false;
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(<h3 key={elements.length} className="tutorial-h3">{parseInline(trimmed.slice(4))}</h3>);
        continue;
      }
      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(<h2 key={elements.length} className="tutorial-h2">{parseInline(trimmed.slice(3))}</h2>);
        continue;
      }
      if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(<h1 key={elements.length} className="tutorial-h1">{parseInline(trimmed.slice(2))}</h1>);
        continue;
      }

      // Bullet list items
      if (trimmed.match(/^[-*+]\s/)) {
        if (listType === 'numbered') flushList();
        listItems.push(trimmed.slice(2));
        listType = 'bullet';
        inList = true;
        continue;
      } else if (inList && listType === 'bullet') {
        flushList();
        inList = false;
      }

      // Numbered lists
      if (trimmed.match(/^\d+\.\s/)) {
        if (listType === 'bullet') flushList();
        listItems.push(trimmed.replace(/^\d+\.\s/, ''));
        listType = 'numbered';
        inList = true;
        continue;
      } else if (inList && listType === 'numbered') {
        flushList();
        inList = false;
      }

      // Regular paragraph
      flushList();
      elements.push(<p key={elements.length} className="tutorial-p">{parseInline(line)}</p>);
    }

    flushList();
    flushTable();

    return <div className="formatted-content">{elements}</div>;
  };

  return <>{parseContent(content)}</>;
}

export function Tutorial({
  profileId,
  absoluteDay,
  onSessionComplete,
  initialCategory = 'foundation',
  initialSection,
}: TutorialProps): ReactElement {
  const [state, setState] = useState<TutorialState>({
    view: initialSection ? 'slide' : 'categories',
    categoryId: initialCategory,
    sectionId: initialSection || null,
    slideIndex: 0,
    completedSlides: new Set(),
  });

  const category = useMemo(
    () => (state.categoryId ? getTutorialCategory(state.categoryId) : null),
    [state.categoryId],
  );

  const section = useMemo(
    () => (state.sectionId && state.categoryId ? getTutorialSection(state.categoryId, state.sectionId) : null),
    [state.categoryId, state.sectionId],
  );

  const slide = useMemo(() => section?.slides[state.slideIndex] ?? null, [section, state.slideIndex]);

  const totalSlides = section?.slides.length ?? 0;
  const progress = totalSlides > 0 ? ((state.slideIndex + 1) / totalSlides) * 100 : 0;
  const isSlideComplete = slide ? state.completedSlides.has(slide.id) : false;

  const navigateToCategory = useCallback((categoryId: string) => {
    setState((s) => ({
      ...s,
      view: 'section',
      categoryId,
      sectionId: null,
      slideIndex: 0,
    }));
  }, []);

  const navigateToSection = useCallback((sectionId: string) => {
    setState((s) => ({
      ...s,
      view: 'slide',
      sectionId,
      slideIndex: 0,
    }));
  }, []);

  const nextSlide = useCallback(() => {
    setState((s) => {
      if (!s.sectionId || !s.categoryId) return s;
      const cat = getTutorialCategory(s.categoryId);
      const sec = cat?.sections.find((secItem) => secItem.id === s.sectionId);
      const maxIndex = (sec?.slides.length ?? 1) - 1;
      if (s.slideIndex >= maxIndex) {
        const sections = cat?.sections ?? [];
        const currentIdx = sections.findIndex((secItem) => secItem.id === s.sectionId);
        const nextIdx = currentIdx + 1;
        if (currentIdx >= 0 && nextIdx < sections.length) {
          const nextSection = sections[nextIdx];
          if (nextSection) {
            return {
              ...s,
              sectionId: nextSection.id,
              slideIndex: 0,
            };
          }
        }
        return s;
      }
      return { ...s, slideIndex: s.slideIndex + 1 };
    });
  }, []);

  const prevSlide = useCallback(() => {
    setState((s) => {
      if (!s.sectionId || !s.categoryId) return s;
      const cat = getTutorialCategory(s.categoryId);
      if (s.slideIndex > 0) {
        return { ...s, slideIndex: s.slideIndex - 1 };
      }
      const sections = cat?.sections ?? [];
      const currentIdx = sections.findIndex((secItem) => secItem.id === s.sectionId);
      const prevIdx = currentIdx - 1;
      if (currentIdx > 0 && prevIdx >= 0 && prevIdx < sections.length) {
        const prevSection = sections[prevIdx];
        if (prevSection) {
          return {
            ...s,
            sectionId: prevSection.id,
            slideIndex: prevSection.slides.length - 1,
          };
        }
      }
      return s;
    });
  }, []);

  const markSlideComplete = useCallback(() => {
    if (!slide) return;
    setState((s) => ({
      ...s,
      completedSlides: new Set([...s.completedSlides, slide.id]),
    }));
  }, [slide]);

  const goBack = useCallback(() => {
    setState((s) => {
      if (s.view === 'slide') {
        return { ...s, view: 'section', sectionId: null, slideIndex: 0 };
      }
      if (s.view === 'section') {
        return { ...s, view: 'categories', categoryId: null };
      }
      return s;
    });
  }, []);

  const renderInteractive = useCallback(
    (interactive: TutorialSlide['interactive']) => {
      if (!interactive) return null;

      const handleSessionComplete = (record: unknown) => {
        onSessionComplete?.(record);
      };

      switch (interactive.type) {
        case 'breathing':
          return (
            <div className="tutorial-interactive">
              <BreathingGuide
                profileId={profileId}
                absoluteDay={absoluteDay}
                onSessionComplete={handleSessionComplete}
              />
            </div>
          );
        case 'binaural':
          return (
            <div className="tutorial-interactive">
              <BinauralPlayer
                profileId={profileId}
                absoluteDay={absoluteDay}
                onSessionComplete={handleSessionComplete}
              />
            </div>
          );
        case 'veil-demo':
          return (
            <div className="tutorial-interactive">
              <VeilDemo config={FORCED_CHOICE_CONFIGS.contrast} profileId={profileId} absoluteDay={absoluteDay} />
            </div>
          );
        case 'confidence-calibration':
          return (
            <div className="tutorial-interactive">
              <ConfidenceCalibrationDemo />
            </div>
          );
        default:
          return null;
      }
    },
    [profileId, absoluteDay, onSessionComplete],
  );

  // Category grid view
  if (state.view === 'categories') {
    return (
      <section className="tutorial" aria-labelledby="tutorial-title">
        <header className="tutorial-header">
          <h2 id="tutorial-title">Tutorials</h2>
          <p className="tutorial-subtitle">
            Step-by-step animated guides for each modality. Complete slides to track progress.
          </p>
        </header>

        <div className="tutorial-category-grid" role="list">
          {TUTORIAL_CATEGORIES.map((cat) => (
            <Card
              key={cat.id}
              asArticle
              className="tutorial-category-card"
              interactive
              onClick={() => navigateToCategory(cat.id)}
            >
              <div className="tutorial-category-header">
                <span className="tutorial-category-icon" aria-hidden="true">{cat.icon}</span>
                <div>
                  <h3 className="tutorial-category-title">{cat.title}</h3>
                  <p className="tutorial-category-desc">{cat.description}</p>
                </div>
              </div>
              <div className="tutorial-category-meta">
                <span>{cat.sections.length} sections</span>
                <span>~{cat.sections.reduce((sum, s) => sum + s.durationMinutes, 0)} min</span>
              </div>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  // Section list view
  if (state.view === 'section' && category) {
    const sectionProgress = category.sections.map((sec) => {
      const completedCount = sec.slides.filter((sl) => state.completedSlides.has(sl.id)).length;
      return { section: sec, completed: completedCount, total: sec.slides.length };
    });

    return (
      <section className="tutorial" aria-labelledby="section-title">
        <header className="tutorial-header">
          <Button variant="ghost" className="tutorial-back" onClick={goBack}>
            ← Back to categories
          </Button>
          <div>
            <span className="tutorial-category-badge" style={{ background: `rgb(var(--color-${category.color}) / 0.15)`, color: `rgb(var(--color-${category.color}))` }}>
              {category.icon} {category.title}
            </span>
            <h2 id="section-title" className="tutorial-section-title">{category.title}</h2>
            <p className="tutorial-section-desc">{category.description}</p>
          </div>
        </header>

        <div className="tutorial-section-list" role="list">
          {sectionProgress.map(({ section, completed, total }) => (
            <Card
              key={section.id}
              asArticle
              className="tutorial-section-card"
              interactive
              onClick={() => navigateToSection(section.id)}
            >
              <div className="tutorial-section-header">
                <div>
                  <h3 className="tutorial-section-name">{section.title}</h3>
                  <p className="tutorial-section-desc">{section.description}</p>
                </div>
                <div className="tutorial-section-progress">
                  <span className="tutorial-progress-text">{completed}/{total} slides</span>
                  <div className="tutorial-progress-bar" role="progressbar" aria-valuenow={total > 0 ? Math.round((completed / total) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
                    <div className="tutorial-progress-fill" style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }} />
                  </div>
                </div>
              </div>
              <p className="tutorial-section-meta">~{section.durationMinutes} min</p>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  // Slide view
  if (state.view === 'slide' && slide && section && category) {
    return (
      <section className="tutorial tutorial-slide-view" aria-labelledby="slide-title">
        <header className="tutorial-slide-header">
          <Button variant="ghost" className="tutorial-back" onClick={goBack}>
            ← Back
          </Button>
          <div className="tutorial-slide-breadcrumb">
            <Button variant="ghost" size="sm" onClick={() => setState((s) => ({ ...s, view: 'section', sectionId: null }))}>
              {category.icon} {category.title}
            </Button>
            <span aria-hidden="true">/</span>
            <Button variant="ghost" size="sm" onClick={() => setState((s) => ({ ...s, view: 'section' }))}>
              {section.title}
            </Button>
          </div>
          <div className="tutorial-slide-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="tutorial-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <article className="tutorial-slide" aria-labelledby="slide-title">
          <header className="tutorial-slide-title-bar">
            <h2 id="slide-title" className="tutorial-slide-title">{slide.title}</h2>
            <div className="tutorial-slide-nav">
              <Button
                variant="outline"
                size="sm"
                onClick={prevSlide}
                disabled={state.slideIndex === 0 && (!category?.sections.find((s) => s.id === state.sectionId) || category.sections.indexOf(category.sections.find((s) => s.id === state.sectionId)!) === 0)}
              >
                ← Previous
              </Button>
              <span className="slide-counter">
                {state.slideIndex + 1} / {totalSlides}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={nextSlide}
                disabled={state.slideIndex >= totalSlides - 1 && (!category?.sections.find((s) => s.id === state.sectionId) || category.sections.indexOf(category.sections.find((s) => s.id === state.sectionId)!) >= category.sections.length - 1)}
              >
                Next →
              </Button>
            </div>
          </header>

          <div className="tutorial-slide-content">
            <div className="tutorial-slide-body">
              <FormattedContent content={slide.content} />
            </div>

            {slide.visual && (
              <div className="tutorial-slide-visual" aria-label={`Visual aid: ${slide.visual}`}>
                <VisualAid type={slide.visual} slide={slide} />
              </div>
            )}

            {slide.interactive && (
              <div className="tutorial-interactive-wrapper">
                <h3>Interactive Demo</h3>
                {renderInteractive(slide.interactive)}
              </div>
            )}
          </div>

          <footer className="tutorial-slide-footer">
            <div className="tutorial-slide-actions">
              <Button
                variant={isSlideComplete ? 'outline' : 'primary'}
                onClick={markSlideComplete}
                disabled={isSlideComplete}
              >
                {isSlideComplete ? '✓ Completed' : 'Mark Complete'}
              </Button>
              <Button variant="outline" onClick={prevSlide} disabled={state.slideIndex === 0}>
                ← Previous
              </Button>
              <Button variant="primary" onClick={nextSlide} disabled={state.slideIndex >= totalSlides - 1}>
                Next →
              </Button>
            </div>
          </footer>
        </article>
      </section>
    );
  }

  return (
    <div className="tutorial-empty" role="status">
      <p>Select a tutorial category to begin.</p>
    </div>
  );
}

// Visual aid component
function VisualAid({ type, slide }: { type: TutorialSlide['visual']; slide: TutorialSlide }): ReactElement {
  // Determine which specific animation to show based on slide content
  const getAnimationForSlide = (slide: TutorialSlide) => {
    const title = slide.title.toLowerCase();
    const content = slide.content.toLowerCase();

    // Breathing-related animations
    if (title.includes('breathing') || title.includes('cardiac coherence') ||
        content.includes('breathing') || content.includes('cardiac coherence') ||
        content.includes('0.1 hz') || content.includes('inhale') || content.includes('exhale')) {
      return <BreathingAnimation />;
    }

    // Binaural-related animations
    if (title.includes('binaural') || title.includes('brainwave') ||
        content.includes('binaural') || content.includes('brainwave') ||
        content.includes('alpha') || content.includes('theta') || content.includes('gamma') ||
        content.includes('entrainment') || content.includes('hemi-sync')) {
      return <BinauralAnimation />;
    }

    // Veil-related animations (forced choice, commitment, reveal)
    if (title.includes('veil') || title.includes('commit') || title.includes('reveal') ||
        content.includes('veil') || content.includes('commit') || content.includes('reveal') ||
        content.includes('sha-256') || content.includes('commitment') ||
        title.includes('forced choice') || title.includes('discrimination') ||
        title.includes('contrast') || title.includes('color recognition') ||
        title.includes('shape') || title.includes('symbol') || title.includes('text reading')) {
      return <VeilAnimation />;
    }

    // Combined preparation flow
    if (title.includes('combined') || title.includes('preparation') ||
        content.includes('combined') || content.includes('preparation flow') ||
        content.includes('heart-center') || content.includes('visualization')) {
      return (
        <div className="combined-animation">
          <BreathingAnimation />
          <BinauralAnimation />
          <VeilAnimation />
        </div>
      );
    }

    // Default to veil animation for perception exercises
    return <VeilAnimation />;
  };

  switch (type) {
    case 'animation':
      return (
        <div className="visual-animation" aria-label="Animated demonstration">
          <div className="animation-demo">
            <div className="animation-frame">
              {getAnimationForSlide(slide)}
            </div>
            <p className="animation-caption">{slide.title}</p>
          </div>
        </div>
      );
    case 'diagram':
      return (
        <div className="visual-diagram" aria-label="Diagram">
          <div className="diagram-container">
            <InteractiveDiagram slide={slide} />
          </div>
        </div>
      );
    case 'video':
      return (
        <div className="visual-video" aria-label="Video demonstration">
          <div className="video-container">
            <VideoPlayer slide={slide} />
          </div>
        </div>
      );
    case 'interactive':
      return (
        <div className="visual-interactive" aria-label="Interactive element">
          <div className="interactive-container">
            <InteractiveElement slide={slide} />
          </div>
        </div>
      );
    default:
      return <div className="visual-unknown" aria-label="Unknown visual type">Unknown visual type</div>;
  }
}

// Visual aid animation components

function BreathingAnimation(): ReactElement {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const cycle = () => {
      // Inhale 5s
      setPhase('inhale');
      setProgress(0);
      const inhaleInterval = setInterval(() => setProgress(p => p + 2), 100);
      setTimeout(() => {
        clearInterval(inhaleInterval);
        // Hold 1s
        setPhase('hold');
        setProgress(0);
        setTimeout(() => {
          // Exhale 5s
          setPhase('exhale');
          setProgress(0);
          const exhaleInterval = setInterval(() => setProgress(p => p + 2), 100);
          setTimeout(() => {
            clearInterval(exhaleInterval);
            cycle();
          }, 5000);
        }, 1000);
      }, 5000);
      return () => clearInterval(inhaleInterval);
    };
    cycle();
  }, []);

  const colors = {
    inhale: 'rgb(var(--color-accent))',
    hold: 'rgb(var(--color-warning))',
    exhale: 'rgb(var(--color-success))',
  };

  return (
    <div className="breathing-animation" role="img" aria-label="Breathing cycle animation">
      <div
        className="breathing-circle"
        style={{
          background: colors[phase],
          transform: `scale(${0.5 + progress / 200})`,
          boxShadow: `0 0 ${20 + progress / 5}px ${colors[phase]}`,
        }}
      />
      <p className="breathing-label">{phase.charAt(0).toUpperCase() + phase.slice(1)}</p>
    </div>
  );
}

function BinauralAnimation(): ReactElement {
  const [time, setTime] = useState(0);
  const leftFreq = 155;
  const rightFreq = 145;
  const beatFreq = Math.abs(leftFreq - rightFreq);

  useEffect(() => {
    const id = requestAnimationFrame(function animate(t) {
      setTime(t / 1000);
      requestAnimationFrame(animate);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Generate points for left wave (slightly higher freq)
  const leftPoints = Array.from({ length: 200 }, (_, i) => {
    const x = (i / 199) * 400;
    const y = 50 + Math.sin((x / 400) * Math.PI * 4 * (leftFreq / 100) + time * leftFreq / 50) * 30;
    return `${x},${y}`;
  }).join(' ');

  // Generate points for right wave (slightly lower freq)
  const rightPoints = Array.from({ length: 200 }, (_, i) => {
    const x = (i / 199) * 400;
    const y = 150 + Math.sin((x / 400) * Math.PI * 4 * (rightFreq / 100) + time * rightFreq / 50) * 30;
    return `${x},${y}`;
  }).join(' ');

  // Generate points for perceived beat (amplitude modulation)
  const beatPoints = Array.from({ length: 200 }, (_, i) => {
    const x = (i / 199) * 400;
    const envelope = Math.abs(Math.sin((x / 400) * Math.PI * 2 * (beatFreq / 10) + time * beatFreq / 10)) * 30;
    const y = 250 - envelope;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="binaural-animation" role="img" aria-label="Binaural beats visualization">
      <div className="binaural-explanation">
        <h4>Binaural Beats: How They Work</h4>
        <p className="binaural-freqs">
          Left ear: <strong>{leftFreq} Hz</strong> → Right ear: <strong>{rightFreq} Hz</strong> → Brain perceives: <strong>{beatFreq} Hz beat</strong>
        </p>
      </div>
      <svg className="binaural-waves" viewBox="0 0 400 300" aria-label="Binaural beats wave visualization">
        <defs>
          <linearGradient id="leftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(var(--color-accent))" />
            <stop offset="100%" stopColor="rgb(var(--color-accent) / 0.3)" />
          </linearGradient>
          <linearGradient id="rightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(var(--color-success))" />
            <stop offset="100%" stopColor="rgb(var(--color-success) / 0.3)" />
          </linearGradient>
          <linearGradient id="beatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(var(--color-warning))" />
            <stop offset="100%" stopColor="rgb(var(--color-warning) / 0.3)" />
          </linearGradient>
        </defs>
        
        {/* Frequency labels */}
        <text x="10" y="50" fill="rgb(var(--color-text-muted))" fontFamily="var(--font-mono)" fontSize="11" textAnchor="start">Left Ear (155 Hz)</text>
        <text x="10" y="150" fill="rgb(var(--color-text-muted))" fontFamily="var(--font-mono)" fontSize="11" textAnchor="start">Right Ear (145 Hz)</text>
        <text x="10" y="280" fill="rgb(var(--color-text-muted))" fontFamily="var(--font-mono)" fontSize="11" textAnchor="start">Perceived Beat (10 Hz)</text>
        
        {/* Left ear wave */}
        <polyline 
          points={leftPoints} 
          fill="none" 
          stroke="url(#leftGrad)" 
          strokeWidth="2" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Right ear wave */}
        <polyline 
          points={rightPoints} 
          fill="none" 
          stroke="url(#rightGrad)" 
          strokeWidth="2" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Perceived beat envelope */}
        <polyline 
          points={beatPoints} 
          fill="none" 
          stroke="url(#beatGrad)" 
          strokeWidth="3" 
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8,4"
        />
        
        {/* Carrier frequency reference lines */}
        <line x1="0" y1="50" x2="400" y2="50" stroke="rgb(var(--color-border))" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="0" y1="150" x2="400" y2="150" stroke="rgb(var(--color-border))" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="0" y1="250" x2="400" y2="250" stroke="rgb(var(--color-border))" strokeWidth="1" strokeDasharray="4,4" />
        
        {/* Beat frequency annotation */}
        <g className="beat-annotation">
          <line x1="100" y1="280" x2="300" y2="280" stroke="rgb(var(--color-warning))" strokeWidth="2" />
          <text x="200" y="275" fill="rgb(var(--color-warning))" fontFamily="var(--font-mono)" fontSize="10" textAnchor="middle">{beatFreq} Hz beat</text>
        </g>
      </svg>
    </div>
  );
}

function VeilAnimation(): ReactElement {
  const [state, setState] = useState<'perceiving' | 'committing' | 'revealing' | 'revealed'>('perceiving');
  const [targetType, setTargetType] = useState<'color' | 'shape' | 'symbol'>('color');
  const [targetValue, setTargetValue] = useState('#ff4444');

  const targets = [
    { type: 'color' as const, value: '#ff4444', label: 'Red' },
    { type: 'color' as const, value: '#4444ff', label: 'Blue' },
    { type: 'shape' as const, value: 'circle', label: 'Circle' },
    { type: 'shape' as const, value: 'triangle', label: 'Triangle' },
    { type: 'symbol' as const, value: 'A', label: 'A' },
    { type: 'symbol' as const, value: 'Z', label: 'Z' },
  ];

  const targetIndex = targets.findIndex(t => t.type === targetType && t.value === targetValue);
  const nextTarget = targets[(targetIndex + 1) % targets.length];

  useEffect(() => {
    const cycle = () => {
      // Perceiving phase - target behind veil
      setState('perceiving');
      setTimeout(() => {
        // Committing phase
        setState('committing');
        setTimeout(() => {
          // Revealing phase - veil lifts
          setState('revealing');
          setTimeout(() => {
            // Revealed - show target
            setState('revealed');
            setTimeout(() => {
              // Next target
              if (nextTarget) {
                setTargetType(nextTarget.type);
                setTargetValue(nextTarget.value);
              }
              cycle();
            }, 3000);
          }, 1500);
        }, 1000);
      }, 3000);
    };
    cycle();
  }, []);

  return (
    <div className="veil-animation" role="img" aria-label="Veil perception and reveal animation">
      <div className="veil-explanation">
        <h4>The Veil Metaphor: Commit Before Reveal</h4>
        <p className="veil-step">{state === 'perceiving' && '1. Perceive the target behind the veil'}</p>
        <p className="veil-step">{state === 'committing' && '2. Commit your answer (SHA-256 locked)'}</p>
        <p className="veil-step">{state === 'revealing' && '3. The veil lifts...'}</p>
        <p className="veil-step">{state === 'revealed' && `4. Target revealed: ${targets.find(t => t.type === targetType && t.value === targetValue)?.label || 'Target'} — verified against commitment`}</p>
      </div>
      <div className="veil-stage">
        <div className={`veil-fabric ${state}`} />
        <div className="veil-target">
          {targetType === 'color' && (
            <div className="fc-visual-target fc-visual-color" style={{ backgroundColor: targetValue }} aria-hidden="true" />
          )}
          {targetType === 'shape' && (
            <ShapeIcon shape={targetValue} className="fc-visual-target fc-visual-shape" />
          )}
          {targetType === 'symbol' && (
            <span className="fc-visual-target fc-visual-symbol">{targetValue}</span>
          )}
        </div>
        <div className="veil-status">
          {state === 'perceiving' && '🧘 Perceiving...'}
          {state === 'committing' && '🔒 Committing...'}
          {state === 'revealing' && '🌅 Revealing...'}
          {state === 'revealed' && '✅ Verified'}
        </div>
      </div>
    </div>
  );
}

function InteractiveDiagram({ slide }: { slide: TutorialSlide }): ReactElement {
  return (
    <div className="interactive-diagram">
      <p className="diagram-title">{slide.title}</p>
      <div className="diagram-content">
        <p>Interactive diagram for: {slide.title}</p>
        <div className="diagram-placeholder-svg">
          <svg viewBox="0 0 400 200" className="diagram-svg">
            <rect x="50" y="50" width="100" height="100" rx="10" fill="rgb(var(--color-accent) / 0.2)" stroke="rgb(var(--color-accent))" strokeWidth="2" />
            <circle cx="250" cy="100" r="50" fill="rgb(var(--color-success) / 0.2)" stroke="rgb(var(--color-success))" strokeWidth="2" />
            <polygon points="350,50 400,150 300,150" fill="rgb(var(--color-warning) / 0.2)" stroke="rgb(var(--color-warning))" strokeWidth="2" />
            <text x="50" y="30" fill="rgb(var(--color-text-muted))" fontFamily="var(--font-mono)" fontSize="12">Shape Discrimination</text>
            <text x="250" y="30" fill="rgb(var(--color-text-muted))" fontFamily="var(--font-mono)" fontSize="12">Center Pulling</text>
            <text x="350" y="30" fill="rgb(var(--color-text-muted))" fontFamily="var(--font-mono)" fontSize="12">Edge Sensing</text>
          </svg>
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ slide }: { slide: TutorialSlide }): ReactElement {
  return (
    <div className="video-player" role="region" aria-label="Video player">
      <div className="video-frame">
        <div className="video-placeholder-content">
          <svg className="play-button" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="45" fill="rgb(var(--color-accent) / 0.3)" stroke="rgb(var(--color-accent))" strokeWidth="2" />
            <polygon points="40,35 40,65 70,50" fill="rgb(var(--color-accent))" />
          </svg>
          <p>Video: {slide.title}</p>
          <p className="video-meta">Click to play (placeholder)</p>
        </div>
      </div>
      <p className="video-caption">{slide.title}</p>
    </div>
  );
}

function InteractiveElement({ slide }: { slide: TutorialSlide }): ReactElement {
  return (
    <div className="interactive-element">
      <p className="interactive-title">{slide.title}</p>
      <div className="interactive-demo">
        <ConfidenceCalibrationDemo />
      </div>
    </div>
  );
}

// Veil demo component for tutorial
function VeilDemo({
  config,
  profileId,
  absoluteDay,
}: {
  config: import('../features/exercises').ForcedChoiceConfig;
  profileId: string;
  absoluteDay: number;
}): ReactElement {
  return (
    <ForcedChoiceSession
      config={config}
      profileId={profileId}
      absoluteDay={absoluteDay}
      dayInPhase={1}
      difficulty="beginner"
      onSessionComplete={() => {}}
    />
  );
}

// Confidence calibration demo
function ConfidenceCalibrationDemo(): ReactElement {
  const [confidence, setConfidence] = useState(3);
  const [history, setHistory] = useState<Array<{ confidence: number; correct: boolean }>>([]);

  const handleSubmit = (correct: boolean) => {
    setHistory((h) => [...h, { confidence, correct }].slice(-10));
    setConfidence(3);
  };

  const calibration = history.length > 0
    ? history.filter((h) => h.confidence >= 4).length / Math.max(1, history.filter((h) => h.confidence >= 4).length)
    : 0;

  return (
    <div className="confidence-calibration-demo">
      <p>Practice calibrating your confidence. Rate 1-5, then see if you were correct.</p>
      <div className="confidence-input">
        <label htmlFor="demo-confidence">Confidence (1-5):</label>
        <input
          id="demo-confidence"
          type="range"
          min={1}
          max={5}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
        />
        <span>{confidence}/5</span>
      </div>
      <div className="confidence-buttons">
        <Button variant="primary" onClick={() => handleSubmit(true)}>Correct</Button>
        <Button variant="outline" onClick={() => handleSubmit(false)}>Incorrect</Button>
      </div>
      {history.length > 0 && (
        <div className="calibration-results">
          <h4>Calibration Results</h4>
          <p>High-confidence (≥4) accuracy: {Math.round(calibration * 100)}%</p>
          <p>Total trials: {history.length}</p>
          <ul>
            {history.slice(-5).reverse().map((h, i) => (
              <li key={i}>
                Confidence: {h.confidence}/5 — {h.correct ? '✓' : '✗'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Tutorial;