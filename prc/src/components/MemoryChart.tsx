import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';
import { GIB, KIB, memoryModel } from '../sizing';
import type { SizingConstants } from '../sizing';

// Real use cases, drawn as reference dots.
const EXAMPLE_SERIES = [100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000];

const TICKS = [10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000,
  10000000, 20000000, 50000000, 100000000, 200000000, 500000000, 1000000000];

const Y_TICKS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

const COLORS = {
  limit: '#12b886',
  request: '#7950f2',
  workingSet: '#868e96',
  example: '#1971c2',
  user: '#fa5252',
};

export interface MemoryChartProps {
  constants: SizingConstants;
  scrapeIntervalSec: number;
  userSeries: number | null;
}

const formatSeries = (d: number) => {
  if (d >= 1000000) return `${(d / 1000000).toFixed(d % 1000000 === 0 ? 0 : 1)}M`;
  if (d >= 1000) return `${(d / 1000).toFixed(0)}K`;
  return d.toString();
};

/**
 * MemoryChart - Memory limit, request and working set against active series,
 * holding the scrape interval and assumptions constant.
 */
export function MemoryChart({ constants, scrapeIntervalSec, userSeries }: MemoryChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.innerHTML = '';

    const minSeries = Math.min(100000, userSeries ? userSeries / 1.5 : Infinity);
    const maxSeries = Math.max(12000000, userSeries ? userSeries * 1.5 : 0);

    const point = (series: number) => {
      const m = memoryModel(series, scrapeIntervalSec, constants);
      const limitGiB = m.limitBytes / GIB;
      return {
        series,
        limitGiB,
        requestGiB: (limitGiB * constants.requestPercent) / 100,
        workingSetGiB: m.workingSetBytes / GIB,
        kibPerSeries: m.limitBytes / series / KIB,
      };
    };

    const steps = 80;
    const curve = Array.from({ length: steps + 1 }, (_, i) =>
      point(minSeries * Math.pow(maxSeries / minSeries, i / steps)));
    const examples = EXAMPLE_SERIES.map(point);
    const userPoint = userSeries ? point(userSeries) : null;

    const yMin = Math.min(...curve.map((d) => d.workingSetGiB)) * 0.9;
    const yMax = Math.max(...curve.map((d) => d.limitGiB)) * 1.1;
    const yTicks = Y_TICKS.filter((t) => t >= yMin && t <= yMax);
    const xTicks = TICKS.filter((t) => t >= minSeries && t <= maxSeries);

    const tip = (d: ReturnType<typeof point>, name: string) =>
      `${formatSeries(d.series)} time series${name}\n`
      + `Memory limit: ${d.limitGiB.toFixed(1)} GiB (${d.kibPerSeries.toFixed(2)} KiB per series)\n`
      + `Memory request: ${d.requestGiB.toFixed(1)} GiB\n`
      + `Working set: ${d.workingSetGiB.toFixed(1)} GiB`;

    const marks: Plot.Markish[] = [
      Plot.line(curve, {
        x: 'series', y: 'workingSetGiB', stroke: COLORS.workingSet, strokeWidth: 1.5,
      }),
      Plot.line(curve, {
        x: 'series', y: 'requestGiB', stroke: COLORS.request, strokeWidth: 2, strokeDasharray: '6,4',
      }),
      Plot.line(curve, {
        x: 'series', y: 'limitGiB', stroke: COLORS.limit, strokeWidth: 2.5,
      }),
      Plot.dot(examples, {
        x: 'series', y: 'limitGiB', fill: COLORS.example, r: 5, title: (d) => tip(d, ''),
      }),
      // Explicit axis: the log scale's own formatter blanks labels like 500K.
      Plot.axisX(xTicks, {
        tickFormat: formatSeries, label: 'Active Time Series', labelAnchor: 'right', labelArrow: true,
      }),
      Plot.axisY(yTicks, {
        tickFormat: (d: number) => d.toLocaleString('en-US'), label: 'Memory (GiB)', labelArrow: true,
      }),
      Plot.gridY(yTicks, { strokeOpacity: 0.1 }),
      Plot.gridX(xTicks, { strokeOpacity: 0.1 }),
    ];

    if (userPoint) {
      marks.push(Plot.dot([userPoint], {
        x: 'series', y: 'limitGiB', fill: COLORS.user, r: 7, stroke: 'white', strokeWidth: 2,
        title: (d) => tip(d, ' (your configuration)'),
      }));
    }

    const plot = Plot.plot({
      marks,
      x: {
        type: 'log',
        domain: [minSeries, maxSeries],
      },
      y: {
        type: 'log',
        domain: [yMin, yMax],
      },
      marginLeft: 60,
      marginBottom: 50,
      marginTop: 30,
      width: chartRef.current.clientWidth,
      height: 500,
      style: {
        fontSize: '13px',
        background: 'white',
      },
    });

    chartRef.current.appendChild(plot);
  }, [constants, scrapeIntervalSec, userSeries]);

  const swatch = (style: React.CSSProperties, label: string, className?: string) => (
    <div className="d-flex gap-2 align-items-center">
      <div style={style} />
      <small className={className}>{label}</small>
    </div>
  );

  return (
    <div className="d-flex flex-column gap-3">
      <div ref={chartRef} style={{ width: '100%', overflow: 'auto' }} />
      <div className="d-flex gap-4 flex-wrap">
        {swatch({ width: 30, height: 3, backgroundColor: COLORS.limit, borderRadius: 2 }, 'Memory limit')}
        {swatch({ width: 30, height: 0, borderTop: `2px dashed ${COLORS.request}` }, 'Memory request')}
        {swatch({ width: 30, height: 2, backgroundColor: COLORS.workingSet }, 'Working set')}
        {swatch({ width: 8, height: 8, backgroundColor: COLORS.example, borderRadius: '50%' }, 'Example configurations')}
        {userSeries && swatch({
          width: 12, height: 12, backgroundColor: COLORS.user, borderRadius: '50%',
          border: '2px solid white', boxShadow: `0 0 0 1px ${COLORS.user}`,
        }, 'Your configuration', 'fw-semibold text-danger')}
      </div>
    </div>
  );
}
