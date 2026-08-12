/**
 * Lightweight, zero-dependency SVG chart components for the Statistics Dashboard.
 *
 * Design principles:
 *  - No external charting library (keeps bundle small, ~no deps)
 *  - Fully accessible: <title> descriptions, data-table fallbacks, ARIA labels
 *  - Theme-aware via CSS custom properties
 *  - Framework-agnostic SVG rendering
 */

import { type ReactElement } from 'react';
import { clsx } from '../../utils/clsx';
import type { TrendPoint } from '../../features/statistics/types';

/* =======================================================================
 * Shared SVG constants
 * ===================================================================== */

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 240;
const PADDING = { top: 20, right: 20, bottom: 32, left: 36 };

/** Color palette for chart series (accessible, color-blind-safe). */
const COLORS = [
  'rgb(96 165 250)', // blue
  'rgb(74 222 128)', // green
  'rgb(251 146 60)', // orange
  'rgb(248 113 113)', // red
  'rgb(196 183 250)', // purple
];

/**
 * Compute the inner drawable area dimensions.
 */
function innerDims(width: number, height: number) {
  return {
    innerWidth: width - PADDING.left - PADDING.right,
    innerHeight: height - PADDING.top - PADDING.bottom,
  };
}

/**
 * Convert data coordinates to SVG pixel coordinates.
 */
function toPixel(
  x: number,
  y: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  width: number,
  height: number,
): { px: number; py: number } {
  const dims = innerDims(width, height);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const px = PADDING.left + ((x - xMin) / xRange) * dims.innerWidth;
  // SVG y is inverted (0 = top)
  const py = PADDING.top + dims.innerHeight - ((y - yMin) / yRange) * dims.innerHeight;
  return { px, py };
}

/**
 * Generate y-axis tick values (5 ticks by default).
 */
function yTicks(yMin: number, yMax: number, count = 5): number[] {
  const range = yMax - yMin || 1;
  const step = range / count;
  return Array.from({ length: count + 1 }, (_, i) => yMin + step * i);
}

/* =======================================================================
 * LineChart — trends, moving averages, regression lines
 * ===================================================================== */

export interface LineChartSeries {
  readonly name: string;
  readonly data: TrendPoint[];
  readonly color?: string;
  readonly strokeWidth?: number;
}

export interface LineChartProps {
  /** Chart title (for screen readers). */
  readonly title: string;
  /** Chart description (for screen readers). */
  readonly description?: string;
  /** Data series to render. */
  readonly series: LineChartSeries[];
  /** Width in pixels. */
  readonly width?: number;
  /** Height in pixels. */
  readonly height?: number;
  /** Y-axis minimum (auto if not set). */
  readonly yMin?: number;
  /** Y-axis maximum (auto if not set). */
  readonly yMax?: number;
  /** Optional X-axis label. */
  readonly xLabel?: string;
  /** Optional Y-axis label. */
  readonly yLabel?: string;
  /** Additional CSS classes. */
  readonly className?: string;
}

export function LineChart({
  title,
  description,
  series,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  yMin,
  yMax,
  xLabel,
  yLabel,
  className,
}: LineChartProps): ReactElement {
  // Collect all y values for auto-scaling
  const allY = series.flatMap((s) => s.data.map((p) => p.y));
  const allX = series.flatMap((s) => s.data.map((p) => p.x));
  const autoYMin = yMin ?? Math.min(...allY, 0);
  const autoYMax = yMax ?? Math.max(...allY, 1);
  const xMin = Math.min(...allX, 0);
  const xMax = Math.max(...allX, 1);

  const ticks = yTicks(autoYMin, autoYMax);

  const seriesPath = (s: LineChartSeries, color: string): ReactElement => {
    const points = s.data.map((p) => {
      const { px, py } = toPixel(p.x, p.y, xMin, xMax, autoYMin, autoYMax, width, height);
      return `${px},${py}`;
    });
    const d = `M${points.join(' L')}`;
    const strokeWidth = s.strokeWidth ?? 2;

    return (
      <g key={s.name} aria-label={s.name}>
        <title>{s.name}</title>
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {s.data.map((p, i) => {
          const { px, py } = toPixel(p.x, p.y, xMin, xMax, autoYMin, autoYMax, width, height);
          return <circle key={i} cx={px} cy={py} r={strokeWidth} fill={color} />;
        })}
      </g>
    );
  };

  return (
    <div className={clsx('chart line-chart', className)} role="img" aria-labelledby={`lc-title-${title}`}>
      <title id={`lc-title-${title}`}>{title}</title>
      {description && <desc>{description}</desc>}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={description ?? title}
      >
        {/* Y-axis grid + ticks */}
        {ticks.map((t, i) => {
          const { py } = toPixel(0, t, 0, 1, autoYMin, autoYMax, width, height);
          return (
            <g key={i}>
              <line x1={PADDING.left} y1={py} x2={width - PADDING.right} y2={py} stroke="currentColor" strokeWidth={0.5} opacity={0.1} />
              <text x={PADDING.left - 4} y={py + 4} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
                {(t * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line
          x1={PADDING.left}
          y1={height - PADDING.bottom}
          x2={width - PADDING.right}
          y2={height - PADDING.bottom}
          stroke="currentColor"
          strokeWidth={0.5}
        />

        {/* Plot area */}
        <g transform={`translate(${PADDING.left},${PADDING.top})`}>
          {series.map((s, i) =>
            seriesPath(s, COLORS[i % COLORS.length] ?? s.color ?? COLORS[0]!),
          )}
        </g>

        {/* Axis labels */}
        {xLabel && (
          <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7}>
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text x={8} y={height / 2} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7} transform={`rotate(-90 ${8} ${height / 2})`}>
            {yLabel}
          </text>
        )}
      </svg>

      {/* Accessible data table fallback */}
      <table className="chart-data-table sr-only">
        <caption>{title} — data table</caption>
        <thead>
          <tr>
            <th scope="col">Series</th>
            <th scope="col">X</th>
            <th scope="col">Y</th>
          </tr>
        </thead>
        <tbody>
          {series.flatMap((s) =>
            s.data.map((p, i) => (
              <tr key={`${s.name}-${i}`}>
                <td>{s.name}</td>
                <td>{p.x}</td>
                <td>{p.y}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

/* =======================================================================
 * BarChart — per-exercise accuracy
 * ===================================================================== */

export interface BarData {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
  readonly description?: string;
}

export interface BarChartProps {
  readonly title: string;
  readonly description?: string;
  readonly data: BarData[];
  readonly maxValue?: number;
  readonly yAxisLabel?: string;
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
}

export function BarChart({
  title,
  description,
  data,
  maxValue,
  yAxisLabel,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
}: BarChartProps): ReactElement {
  const dims = innerDims(width, height);
  const maxVal = maxValue ?? (Math.max(...data.map((d) => d.value), 0) || 1);
  const barWidth = Math.max(8, (dims.innerWidth / Math.max(data.length, 1)) * 0.7);
  const barSpacing = dims.innerWidth / Math.max(data.length, 1);

  const getValueHeight = (value: number): number =>
    (value / maxVal) * dims.innerHeight;

  return (
    <div className={clsx('chart bar-chart', className)} role="img" aria-labelledby={`bc-title-${title}`}>
      <title id={`bc-title-${title}`}>{title}</title>
      {description && <desc>{description}</desc>}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={description ?? title}>
        {/* Y-axis grid */}
        {yTicks(0, maxVal).map((t, i) => {
          const { py } = toPixel(0, t, 0, 1, 0, maxVal, width, height);
          return (
            <g key={i}>
              <line x1={PADDING.left} y1={py} x2={width - PADDING.right} y2={py} stroke="currentColor" strokeWidth={0.5} opacity={0.1} />
              <text x={PADDING.left - 4} y={py + 4} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
                {(t * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = getValueHeight(d.value);
          const x = PADDING.left + i * barSpacing + (barSpacing - barWidth) / 2;
          const y = height - PADDING.bottom - barHeight;
          const color = d.color ?? COLORS[i % COLORS.length]!;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(0, barHeight)}
                fill={color}
                rx={2}
                aria-label={d.description ?? `${d.label}: ${(d.value * 100).toFixed(1)}%`}
              />
              <text
                x={x + barWidth / 2}
                y={height - PADDING.bottom + 14}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                opacity={0.7}
                transform={`rotate(-30 ${x + barWidth / 2} ${height - PADDING.bottom + 14})`}
              >
                {d.label}
              </text>
              {d.description && (
                <title>{d.description}</title>
              )}
            </g>
          );
        })}

        {yAxisLabel && (
          <text x={8} y={height / 2} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7} transform={`rotate(-90 ${8} ${height / 2})`}>
            {yAxisLabel}
          </text>
        )}
      </svg>

      <table className="chart-data-table sr-only">
        <caption>{title} — data table</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{(d.value * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =======================================================================
 * Heatmap — confusion matrix
 * ===================================================================== */

export interface HeatmapProps {
  readonly title: string;
  readonly description?: string;
  readonly labels: string[];
  readonly matrix: number[][];
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
}

export function Heatmap({
  title,
  description,
  labels,
  matrix,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
}: HeatmapProps): ReactElement {
  const cellSize = Math.min(30, Math.floor(width / Math.max(labels.length, 1)));
  const gridWidth = cellSize * labels.length;
  const offsetX = (width - gridWidth) / 2;
  const offsetY = PADDING.top;

  const maxCount = Math.max(...matrix.flatMap((row) => row), 1);

  const intensity = (count: number): number => {
    const ratio = count / maxCount;
    return 0.15 + 0.85 * ratio; // 15% to 100% opacity
  };

  return (
    <div className={clsx('chart heatmap', className)} role="img" aria-labelledby={`hm-title-${title}`}>
      <title id={`hm-title-${title}`}>{title}</title>
      {description && <desc>{description}</desc>}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={description ?? title}>
        {/* X-axis labels */}
        {labels.map((l, i) => (
          <text
            key={`x-${i}`}
            x={offsetX + i * cellSize + cellSize / 2}
            y={height - PADDING.bottom + 14}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            opacity={0.7}
            transform={`rotate(-30 ${offsetX + i * cellSize + cellSize / 2} ${height - PADDING.bottom + 14})`}
          >
            {l}
          </text>
        ))}

        {/* Y-axis labels */}
        {labels.map((l, i) => (
          <text
            key={`y-${i}`}
            x={PADDING.left / 2 - 4}
            y={offsetY + i * cellSize + cellSize / 2 + 4}
            textAnchor="end"
            fontSize={10}
            fill="currentColor"
            opacity={0.7}
          >
            {l}
          </text>
        ))}

        {/* Cells */}
        {labels.map((_, actualIdx) =>
          labels.map((_, predictedIdx) => {
            const count = matrix[actualIdx]?.[predictedIdx] ?? 0;
            const x = offsetX + predictedIdx * cellSize;
            const y = offsetY + actualIdx * cellSize;
            return (
              <g key={`cell-${actualIdx}-${predictedIdx}`}>
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  fill={`rgba(96, 165, 250, ${intensity(count)})`}
                  stroke="currentColor"
                  strokeWidth={0.5}
                  opacity={0.8}
                />
                <text
                  x={x + cellSize / 2}
                  y={y + cellSize / 2 + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill={count > maxCount * 0.5 ? 'rgb(13 13 21)' : 'currentColor'}
                >
                  {count}
                </text>
              </g>
            );
          }),
        )}

        {/* Axis headers */}
        <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7}>
          Predicted
        </text>
        <text x={4} y={height / 2} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7} transform={`rotate(-90 4 ${height / 2})`}>
          Actual
        </text>
      </svg>

      <table className="chart-data-table sr-only">
        <caption>{title} — confusion matrix</caption>
        <thead>
          <tr>
            <th scope="col">Actual \ Predicted</th>
            {labels.map((l) => (
              <th key={l} scope="col">{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={`row-${i}`}>
              <th scope="row">{labels[i]}</th>
              {row.map((val, j) => (
                <td key={`cell-${i}-${j}`}>{val}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =======================================================================
 * ScatterPlot — correlation scatter
 * ===================================================================== */

export interface ScatterPoint {
  readonly x: number;
  readonly y: number;
  readonly label?: string;
}

export interface ScatterPlotProps {
  readonly title: string;
  readonly description?: string;
  readonly points: ScatterPoint[];
  readonly xLabel?: string;
  readonly yLabel?: string;
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
}

export function ScatterPlot({
  title,
  description,
  points,
  xLabel,
  yLabel,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
}: ScatterPlotProps): ReactElement {
  if (points.length === 0) {
    return (
      <div className={clsx('chart scatter-plot', className)} role="img" aria-label={`${title} — no data`}>
        <p>No data to display.</p>
      </div>
    );
  }

  const allX = points.map((p) => p.x);
  const allY = points.map((p) => p.y);
  const xMin = Math.min(...allX, 0);
  const xMax = Math.max(...allX, 1);
  const yMin = Math.min(...allY, 0);
  const yMax = Math.max(...allY, 1);

  return (
    <div className={clsx('chart scatter-plot', className)} role="img" aria-labelledby={`sp-title-${title}`}>
      <title id={`sp-title-${title}`}>{title}</title>
      {description && <desc>{description}</desc>}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={description ?? title}>
        {/* Axes */}
        <line
          x1={PADDING.left}
          y1={height - PADDING.bottom}
          x2={width - PADDING.right}
          y2={height - PADDING.bottom}
          stroke="currentColor"
          strokeWidth={0.5}
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={height - PADDING.bottom}
          stroke="currentColor"
          strokeWidth={0.5}
        />

        {/* Points */}
        {points.map((p, i) => {
          const { px, py } = toPixel(p.x, p.y, xMin, xMax, yMin, yMax, width, height);
          return (
            <g key={i}>
              <circle cx={px} cy={py} r={4} fill={COLORS[0] ?? 'rgb(96 165 250)'} />
              {p.label && <title>{p.label}</title>}
            </g>
          );
        })}

        {/* Axis labels */}
        {xLabel && (
          <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7}>
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text x={8} y={height / 2} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7} transform={`rotate(-90 8 ${height / 2})`}>
            {yLabel}
          </text>
        )}
      </svg>

      <table className="chart-data-table sr-only">
        <caption>{title} — data table</caption>
        <thead>
          <tr>
            <th scope="col">X</th>
            <th scope="col">Y</th>
            {points[0]?.label && <th scope="col">Label</th>}
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{p.x}</td>
              <td>{p.y}</td>
              {p.label && <td>{p.label}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
