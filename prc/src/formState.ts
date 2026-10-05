// Form state, validation and query string persistence for the calculator.
// Values are kept as the strings the user typed so a half-typed number is
// never rewritten under them.

import { CONSTANT_FIELDS, DEFAULT_CONSTANTS } from './sizing';
import type { ConstantField, ConstantKey, SizingConstants, SizingInputs } from './sizing';

export interface FormState {
  activeSeries: string;
  scrapeInterval: string;
  retentionDays: string;
  constants: Record<ConstantKey, string>;
}

export const DEFAULT_SCRAPE_INTERVAL = 60;
export const DEFAULT_RETENTION_DAYS = 30;

export const DEFAULT_CONSTANT_STRINGS = Object.fromEntries(
  CONSTANT_FIELDS.map((f) => [f.key, String(f.defaultValue)]),
) as Record<ConstantKey, string>;

export const DEFAULT_FORM: FormState = {
  activeSeries: '',
  scrapeInterval: String(DEFAULT_SCRAPE_INTERVAL),
  retentionDays: String(DEFAULT_RETENTION_DAYS),
  constants: DEFAULT_CONSTANT_STRINGS,
};

function parse(value: string): number {
  return value.trim() === '' ? NaN : Number(value);
}

export function activeSeriesError(value: string): string | null {
  if (value.trim() === '') return null;
  const n = parse(value);
  if (!Number.isInteger(n)) return 'Enter a whole number of time series';
  if (n < 1000) return 'Enter at least 1,000 time series';
  return null;
}

export function scrapeIntervalError(value: string): string | null {
  const n = parse(value);
  if (!Number.isFinite(n)) return 'Enter a scrape interval in seconds';
  if (n < 1) return 'Scrape interval must be at least 1 second';
  return null;
}

export function retentionDaysError(value: string): string | null {
  const n = parse(value);
  if (!Number.isFinite(n)) return 'Enter a retention period in days';
  if (n < 1) return 'Retention period must be at least 1 day';
  return null;
}

export function constantError(field: ConstantField, value: string): string | null {
  const n = parse(value);
  if (!Number.isFinite(n)) return 'Enter a number';
  if (n < field.min || n > field.max) return `Must be between ${field.min} and ${field.max}`;
  return null;
}

export interface ValidatedForm {
  inputs: SizingInputs | null;
  constants: SizingConstants | null;
  errors: {
    activeSeries: string | null;
    scrapeInterval: string | null;
    retentionDays: string | null;
    constants: Partial<Record<ConstantKey, string>>;
  };
  /** True when any constant differs from its default */
  modified: boolean;
}

export function validateForm(state: FormState): ValidatedForm {
  const constantErrors: Partial<Record<ConstantKey, string>> = {};
  const constants = { ...DEFAULT_CONSTANTS };
  let modified = false;
  for (const field of CONSTANT_FIELDS) {
    const raw = state.constants[field.key];
    const error = constantError(field, raw);
    if (error) {
      constantErrors[field.key] = error;
      modified = true;
    } else {
      constants[field.key] = parse(raw);
      if (constants[field.key] !== field.defaultValue) modified = true;
    }
  }

  const errors = {
    activeSeries: activeSeriesError(state.activeSeries),
    scrapeInterval: scrapeIntervalError(state.scrapeInterval),
    retentionDays: retentionDaysError(state.retentionDays),
    constants: constantErrors,
  };
  const inputsValid = state.activeSeries.trim() !== ''
    && !errors.activeSeries && !errors.scrapeInterval && !errors.retentionDays;

  return {
    inputs: inputsValid ? {
      activeSeries: parse(state.activeSeries),
      scrapeIntervalSec: parse(state.scrapeInterval),
      retentionDays: parse(state.retentionDays),
    } : null,
    constants: Object.keys(constantErrors).length === 0 ? constants : null,
    errors,
    modified,
  };
}

/** Read form state from a query string. Invalid values fall back to defaults. */
export function readFormState(search: string): FormState {
  const params = new URLSearchParams(search);
  const take = (name: string, check: (v: string) => string | null, fallback: string) => {
    const v = params.get(name);
    return v !== null && v.trim() !== '' && !check(v) ? v.trim() : fallback;
  };

  const constants = { ...DEFAULT_CONSTANT_STRINGS };
  for (const field of CONSTANT_FIELDS) {
    constants[field.key] = take(field.param, (v) => constantError(field, v), constants[field.key]);
  }

  return {
    activeSeries: take('ts', activeSeriesError, ''),
    scrapeInterval: take('si', scrapeIntervalError, DEFAULT_FORM.scrapeInterval),
    retentionDays: take('rd', retentionDaysError, DEFAULT_FORM.retentionDays),
    constants,
  };
}

/**
 * Build a query string ("" or "?a=1&b=2") holding the valid inputs and any
 * constants that differ from their defaults.
 */
export function writeFormState(state: FormState): string {
  const params = new URLSearchParams();
  const put = (name: string, value: string, error: string | null, defaultValue?: number) => {
    if (value.trim() === '' || error) return;
    if (defaultValue !== undefined && parse(value) === defaultValue) return;
    params.set(name, value.trim());
  };

  put('ts', state.activeSeries, activeSeriesError(state.activeSeries));
  put('si', state.scrapeInterval, scrapeIntervalError(state.scrapeInterval), DEFAULT_SCRAPE_INTERVAL);
  put('rd', state.retentionDays, retentionDaysError(state.retentionDays), DEFAULT_RETENTION_DAYS);
  for (const field of CONSTANT_FIELDS) {
    const value = state.constants[field.key];
    put(field.param, value, constantError(field, value), field.defaultValue);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}
