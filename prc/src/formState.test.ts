import { describe, expect, it } from 'vitest';
import { DEFAULT_FORM, readFormState, validateForm, writeFormState } from './formState';
import { DEFAULT_CONSTANTS } from './sizing';

describe('query string state', () => {
  it('writes nothing for the default form', () => {
    expect(writeFormState(DEFAULT_FORM)).toBe('');
  });

  it('writes inputs and only the constants that changed', () => {
    const state = {
      ...DEFAULT_FORM,
      activeSeries: '2000000',
      scrapeInterval: '30',
      constants: { ...DEFAULT_FORM.constants, indexBytesPerSeries: '3500' },
    };
    expect(writeFormState(state)).toBe('?ts=2000000&si=30&ci=3500');
  });

  it('round trips through the query string', () => {
    const state = {
      activeSeries: '5000000',
      scrapeInterval: '15',
      retentionDays: '90',
      constants: { ...DEFAULT_FORM.constants, gomemlimitPercent: '90', headWindowHours: '3' },
    };
    expect(readFormState(writeFormState(state))).toEqual(state);
  });

  it('falls back to defaults for invalid values', () => {
    const state = readFormState('?ts=abc&si=0&rd=-5&ci=0&gm=500&cm=12');
    expect(state.activeSeries).toBe('');
    expect(state.scrapeInterval).toBe(DEFAULT_FORM.scrapeInterval);
    expect(state.retentionDays).toBe(DEFAULT_FORM.retentionDays);
    expect(state.constants.indexBytesPerSeries).toBe(DEFAULT_FORM.constants.indexBytesPerSeries);
    expect(state.constants.gomemlimitPercent).toBe(DEFAULT_FORM.constants.gomemlimitPercent);
    expect(state.constants.memoryBytesPerSample).toBe('12');
  });

  it('skips invalid values when writing', () => {
    expect(writeFormState({ ...DEFAULT_FORM, activeSeries: '500', scrapeInterval: '' })).toBe('');
  });
});

describe('validateForm', () => {
  it('has no inputs until active series is entered', () => {
    const v = validateForm(DEFAULT_FORM);
    expect(v.inputs).toBeNull();
    expect(v.errors.activeSeries).toBeNull();
    expect(v.constants).toEqual(DEFAULT_CONSTANTS);
    expect(v.modified).toBe(false);
  });

  it('flags a blank or zero scrape interval', () => {
    expect(validateForm({ ...DEFAULT_FORM, activeSeries: '1000000', scrapeInterval: '' }).inputs).toBeNull();
    expect(validateForm({ ...DEFAULT_FORM, activeSeries: '1000000', scrapeInterval: '0' }).errors.scrapeInterval)
      .not.toBeNull();
  });

  it('marks modified constants and rejects bad ones', () => {
    const changed = validateForm({ ...DEFAULT_FORM, constants: { ...DEFAULT_FORM.constants, safetyMultiplier: '1.5' } });
    expect(changed.modified).toBe(true);
    expect(changed.constants?.safetyMultiplier).toBe(1.5);

    const bad = validateForm({ ...DEFAULT_FORM, constants: { ...DEFAULT_FORM.constants, safetyMultiplier: '' } });
    expect(bad.constants).toBeNull();
    expect(bad.errors.constants.safetyMultiplier).toBeDefined();
  });
});
