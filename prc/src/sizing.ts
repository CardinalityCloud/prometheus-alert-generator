// Prometheus sizing model.
//
// Memory follows the layered model in prometheus_calculator_specification.md:
//
//   base heap   = series * (index bytes + head samples * memory bytes per sample)
//   working set = base heap * operational multiplier
//   limit       = max(working set * safety multiplier, working set + minimum buffer)
//
// with one change from the spec: the per-sample cost is split in two. Disk
// uses the compressed size of a sample (1.5 B). Memory uses an effective cost
// per sample held in the head block, which also covers the Go allocation and
// GC headroom needed to keep up with ingestion. 1.5 B badly understates that.
//
// Calibration of the defaults (2026-10):
//   * GKE fleet, 60s scrape interval, 2M to 12M active series. Linear
//     regression of container_memory_working_set_bytes /
//     prometheus_tsdb_head_series, rounded up to 7.5 KiB per series for
//     safety. The memory limit must land between 6.5 and 7.5 KiB per series.
//   * Live instance, 30s scrape interval, 21.3M active series, Prometheus
//     2.52.0 (stringlabels). p99 over 2 days per series: RSS 6.92 KiB, Go heap
//     in use 6.11 KiB, working set 9.82 KiB (the gap is reclaimable page
//     cache). The working set must cover RSS and GOMEMLIMIT must sit above
//     the heap.
// The spec's index cost (2800 B) and 1.5 B per sample in memory fail the live
// instance: GOMEMLIMIT would land below the observed heap. 2900 B and 8 B
// satisfy both data sets. See sizing.test.ts.

export const KIB = 1024;
export const MIB = 1024 * 1024;
export const GIB = 1024 * 1024 * 1024;

export interface SizingInputs {
  activeSeries: number;
  scrapeIntervalSec: number;
  retentionDays: number;
}

export interface SizingConstants {
  indexBytesPerSeries: number;
  memoryBytesPerSample: number;
  headWindowHours: number;
  operationalMultiplier: number;
  safetyMultiplier: number;
  minBufferGiB: number;
  gomemlimitPercent: number;
  requestPercent: number;
  diskBytesPerSample: number;
  diskBufferPercent: number;
  memoryPerCoreGiB: number;
  minCores: number;
}

export type ConstantKey = keyof SizingConstants;

export interface ConstantField {
  key: ConstantKey;
  /** Short query string parameter name */
  param: string;
  label: string;
  unit: string;
  hint: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

// Order here is the order shown in the settings panel.
export const CONSTANT_FIELDS: ConstantField[] = [
  {
    key: 'indexBytesPerSeries', param: 'ci', label: 'Index cost per series', unit: 'B',
    hint: 'Labels, postings and series metadata. Raise it for many or long labels.',
    defaultValue: 2900, min: 100, max: 100000, step: 100,
  },
  {
    key: 'memoryBytesPerSample', param: 'cm', label: 'Memory per head sample', unit: 'B',
    hint: 'Head chunks plus Go overhead to keep up with ingestion. Fitted to live data.',
    defaultValue: 8, min: 0.1, max: 1000, step: 0.5,
  },
  {
    key: 'headWindowHours', param: 'hw', label: 'Head window', unit: 'hours',
    hint: 'Recent data held in memory. Prometheus keeps 2 to 3 hours before compaction.',
    defaultValue: 2, min: 0.5, max: 24, step: 0.5,
  },
  {
    key: 'operationalMultiplier', param: 'op', label: 'Operational multiplier', unit: 'x',
    hint: 'Go GC headroom, scrape parsing and query buffers.',
    defaultValue: 1.5, min: 1, max: 10, step: 0.1,
  },
  {
    key: 'safetyMultiplier', param: 'sf', label: 'Safety multiplier', unit: 'x',
    hint: 'Headroom for WAL replay, query spikes and page cache.',
    defaultValue: 1.3, min: 1, max: 10, step: 0.05,
  },
  {
    key: 'minBufferGiB', param: 'mb', label: 'Minimum safety buffer', unit: 'GiB',
    hint: 'Floor on the safety headroom so small instances survive WAL replay.',
    defaultValue: 1.5, min: 0, max: 1024, step: 0.5,
  },
  {
    key: 'gomemlimitPercent', param: 'gm', label: 'GOMEMLIMIT', unit: '% of limit',
    hint: 'Makes Go collect garbage before the container hits its memory limit.',
    defaultValue: 82, min: 10, max: 100, step: 1,
  },
  {
    key: 'requestPercent', param: 'rq', label: 'Memory request', unit: '% of limit',
    hint: 'Lower than the limit so Kubernetes can bin-pack nodes.',
    defaultValue: 70, min: 10, max: 100, step: 5,
  },
  {
    key: 'diskBytesPerSample', param: 'cs', label: 'Disk bytes per sample', unit: 'B',
    hint: 'Compressed size of a sample in TSDB blocks.',
    defaultValue: 1.5, min: 0.1, max: 64, step: 0.1,
  },
  {
    key: 'diskBufferPercent', param: 'db', label: 'Disk buffer', unit: '%',
    hint: 'WAL, compaction and filesystem overhead.',
    defaultValue: 15, min: 0, max: 500, step: 5,
  },
  {
    key: 'memoryPerCoreGiB', param: 'mpc', label: 'Memory per CPU core', unit: 'GiB',
    hint: 'Rough guide based on GCP VM memory to CPU ratios.',
    defaultValue: 4, min: 0.5, max: 128, step: 0.5,
  },
  {
    key: 'minCores', param: 'mc', label: 'Minimum CPU cores', unit: 'cores',
    hint: 'Never recommend fewer cores than this.',
    defaultValue: 2, min: 1, max: 256, step: 1,
  },
];

export const DEFAULT_CONSTANTS = Object.fromEntries(
  CONSTANT_FIELDS.map((f) => [f.key, f.defaultValue]),
) as unknown as SizingConstants;

// Fleet regression band the 60s memory limit must stay within. Checked in tests.
export const FLEET_BAND_KIB = { low: 6.5, high: 7.5 };

/** Round up to a multiple of step, ignoring floating point dust. */
export function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step - 1e-9) * step;
}

export interface MemoryModel {
  headSamplesPerSeries: number;
  bytesPerSeries: number;
  baseHeapBytes: number;
  workingSetBytes: number;
  safetyBufferBytes: number;
  flatBufferBytes: number;
  bufferRule: 'multiplier' | 'minimum';
  limitBytes: number;
}

/** Unrounded memory model. Also used to draw the chart curves. */
export function memoryModel(
  activeSeries: number,
  scrapeIntervalSec: number,
  c: SizingConstants,
): MemoryModel {
  const headSamplesPerSeries = (c.headWindowHours * 3600) / scrapeIntervalSec;
  const bytesPerSeries = c.indexBytesPerSeries + headSamplesPerSeries * c.memoryBytesPerSample;
  const baseHeapBytes = activeSeries * bytesPerSeries;
  const workingSetBytes = baseHeapBytes * c.operationalMultiplier;
  const safetyBufferBytes = workingSetBytes * c.safetyMultiplier;
  const flatBufferBytes = workingSetBytes + c.minBufferGiB * GIB;
  const bufferRule = safetyBufferBytes >= flatBufferBytes ? 'multiplier' : 'minimum';
  return {
    headSamplesPerSeries,
    bytesPerSeries,
    baseHeapBytes,
    workingSetBytes,
    safetyBufferBytes,
    flatBufferBytes,
    bufferRule,
    limitBytes: Math.max(safetyBufferBytes, flatBufferBytes),
  };
}

export interface SizingResult extends MemoryModel {
  /** Memory limit rounded up to 0.1 Gi */
  limitGi: number;
  /** Memory request rounded up to 0.1 Gi */
  requestGi: number;
  /** GOMEMLIMIT rounded down to whole MiB, taken from the rounded limit */
  gomemlimitMiB: number;
  cpuCores: number;
  totalSamples: number;
  rawDiskBytes: number;
  provisionedDiskBytes: number;
  /** Persistent volume size rounded up to whole Gi */
  diskGi: number;
}

export function computeSizing(inputs: SizingInputs, c: SizingConstants): SizingResult {
  const mem = memoryModel(inputs.activeSeries, inputs.scrapeIntervalSec, c);

  const limitGi = ceilTo(mem.limitBytes / GIB, 0.1);
  const requestGi = ceilTo((limitGi * c.requestPercent) / 100, 0.1);
  const gomemlimitMiB = Math.floor((limitGi * GIB * c.gomemlimitPercent) / 100 / MIB);
  const cpuCores = Math.max(c.minCores, Math.round(limitGi / c.memoryPerCoreGiB));

  const totalSamples = (inputs.activeSeries / inputs.scrapeIntervalSec) * inputs.retentionDays * 86400;
  const rawDiskBytes = totalSamples * c.diskBytesPerSample;
  const provisionedDiskBytes = rawDiskBytes * (1 + c.diskBufferPercent / 100);
  const diskGi = Math.ceil(provisionedDiskBytes / GIB - 1e-9);

  return {
    ...mem,
    limitGi,
    requestGi,
    gomemlimitMiB,
    cpuCores,
    totalSamples,
    rawDiskBytes,
    provisionedDiskBytes,
    diskGi,
  };
}

/** Kubernetes quantity with one decimal, e.g. "6.0Gi". */
export function formatGi(gi: number): string {
  return `${gi.toFixed(1)}Gi`;
}

/** Human readable base-1024 size. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * GIB) return `${(bytes / (1024 * GIB)).toFixed(2)} TiB`;
  if (bytes >= GIB) return `${(bytes / GIB).toFixed(2)} GiB`;
  if (bytes >= MIB) return `${(bytes / MIB).toFixed(1)} MiB`;
  if (bytes >= KIB) return `${(bytes / KIB).toFixed(1)} KiB`;
  return `${bytes.toFixed(0)} B`;
}
