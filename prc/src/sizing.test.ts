import { describe, expect, it } from 'vitest';
import {
  computeSizing, memoryModel, ceilTo, DEFAULT_CONSTANTS, FLEET_BAND_KIB, GIB, KIB, MIB,
} from './sizing';
import type { SizingConstants } from './sizing';

// Real use cases shown as example points on the chart.
const EXAMPLE_POINTS = [100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000];
// Range where the GKE fleet regression is trusted.
const FLEET_POINTS = EXAMPLE_POINTS.filter((s) => s >= 2_000_000);
const INTERVALS = [15, 30, 60];

const limitKiBPerSeries = (series: number, interval: number, c = DEFAULT_CONSTANTS) =>
  memoryModel(series, interval, c).limitBytes / series / KIB;

describe('calibration: GKE fleet regression (60s)', () => {
  it.each(FLEET_POINTS)('memory limit for %i series is within the fleet band', (series) => {
    const kib = limitKiBPerSeries(series, 60);
    expect(kib).toBeGreaterThanOrEqual(FLEET_BAND_KIB.low);
    expect(kib).toBeLessThanOrEqual(FLEET_BAND_KIB.high);
  });

  it.each(FLEET_POINTS)('working set for %i series is below the fleet 7.5 KiB figure', (series) => {
    const kib = memoryModel(series, 60, DEFAULT_CONSTANTS).workingSetBytes / series / KIB;
    expect(kib).toBeLessThan(7.5);
  });
});

describe('calibration: live 30s instance, 21.3M series, Prometheus 2.52.0', () => {
  // p99 over 2 days, worst of three replicas.
  const series = 21_286_452;
  const observedRssKiB = 6.92;
  const observedHeapKiB = 6.11;
  const result = computeSizing(
    { activeSeries: series, scrapeIntervalSec: 30, retentionDays: 15 },
    DEFAULT_CONSTANTS,
  );

  it('working set covers observed RSS', () => {
    expect(result.workingSetBytes / series / KIB).toBeGreaterThanOrEqual(observedRssKiB);
  });

  it('GOMEMLIMIT sits at least 10% above the observed Go heap', () => {
    expect((result.gomemlimitMiB * MIB) / series / KIB).toBeGreaterThanOrEqual(observedHeapKiB * 1.1);
  });

  it('memory limit is at least 25% above observed RSS', () => {
    expect((result.limitGi * GIB) / series / KIB).toBeGreaterThanOrEqual(observedRssKiB * 1.25);
  });
});

describe('example points', () => {
  for (const interval of INTERVALS) {
    it.each(EXAMPLE_POINTS)(`limit for %i series at ${interval}s is never below the fleet band`, (series) => {
      expect(limitKiBPerSeries(series, interval)).toBeGreaterThanOrEqual(FLEET_BAND_KIB.low);
    });
  }

  it.each(EXAMPLE_POINTS)('a shorter scrape interval needs more memory for %i series', (series) => {
    const [m15, m30, m60] = INTERVALS.map((i) => memoryModel(series, i, DEFAULT_CONSTANTS).limitBytes);
    expect(m15).toBeGreaterThan(m30);
    expect(m30).toBeGreaterThan(m60);
  });

  it('small instances use the minimum buffer and large ones the multiplier', () => {
    expect(memoryModel(100_000, 60, DEFAULT_CONSTANTS).bufferRule).toBe('minimum');
    expect(memoryModel(10_000_000, 60, DEFAULT_CONSTANTS).bufferRule).toBe('multiplier');
  });
});

describe('spec formulas', () => {
  // The spec's original constants: one cost per sample for memory and disk.
  const spec: SizingConstants = {
    ...DEFAULT_CONSTANTS,
    indexBytesPerSeries: 2800,
    memoryBytesPerSample: 1.5,
  };

  it('matches the spec for 1M series, 30s, 15d', () => {
    const S = 1_000_000;
    const I = 30;
    const R = 15;
    const baseHeap = S * (2800 + (7200 / I) * 1.5);
    const workingSet = baseHeap * 1.5;
    const limit = Math.max(workingSet * 1.3, workingSet + 1.5 * GIB);
    const disk = (S / I) * R * 86400 * 1.5 * 1.15;

    const r = computeSizing({ activeSeries: S, scrapeIntervalSec: I, retentionDays: R }, spec);
    expect(r.baseHeapBytes).toBeCloseTo(baseHeap);
    expect(r.workingSetBytes).toBeCloseTo(workingSet);
    expect(r.limitBytes).toBeCloseTo(limit);
    expect(r.provisionedDiskBytes).toBeCloseTo(disk);
  });
});

describe('rounding and outputs', () => {
  const r = computeSizing({ activeSeries: 1_000_000, scrapeIntervalSec: 30, retentionDays: 15 }, DEFAULT_CONSTANTS);

  it('rounds the limit up to 0.1 Gi', () => {
    expect(r.limitGi).toBeGreaterThanOrEqual(r.limitBytes / GIB);
    expect(r.limitGi - r.limitBytes / GIB).toBeLessThan(0.1);
    expect(Math.round(r.limitGi * 10)).toBeCloseTo(r.limitGi * 10);
  });

  it('rounds the request up from the rounded limit', () => {
    expect(r.requestGi).toBeGreaterThanOrEqual(r.limitGi * 0.7);
    expect(r.requestGi - r.limitGi * 0.7).toBeLessThan(0.1);
  });

  it('rounds GOMEMLIMIT down from the rounded limit', () => {
    const exactMiB = (r.limitGi * GIB * 0.82) / MIB;
    expect(r.gomemlimitMiB).toBeLessThanOrEqual(exactMiB);
    expect(exactMiB - r.gomemlimitMiB).toBeLessThan(1);
  });

  it('rounds disk up to a whole Gi', () => {
    expect(Number.isInteger(r.diskGi)).toBe(true);
    expect(r.diskGi).toBeGreaterThanOrEqual(r.provisionedDiskBytes / GIB);
  });

  it('keeps the original CPU heuristic', () => {
    expect(r.cpuCores).toBe(Math.max(2, Math.round(r.limitGi / 4)));
    const big = computeSizing({ activeSeries: 10_000_000, scrapeIntervalSec: 60, retentionDays: 30 }, DEFAULT_CONSTANTS);
    expect(big.cpuCores).toBe(Math.max(2, Math.round(big.limitGi / 4)));
  });

  it('ceilTo ignores floating point dust', () => {
    expect(ceilTo(6.0000000001, 0.1)).toBeCloseTo(6.0);
    expect(ceilTo(6.01, 0.1)).toBeCloseTo(6.1);
  });
});
