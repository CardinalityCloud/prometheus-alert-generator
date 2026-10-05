import { useEffect, useMemo, useState } from 'react';
import { Container, Card, Badge, Button, Collapse, Form, Table } from 'react-bootstrap';
import { InfoBox } from './components/InfoBox';
import { AssumptionsPanel } from './components/AssumptionsPanel';
import { MemoryChart } from './components/MemoryChart';
import { computeSizing, formatBytes, formatGi, GIB, KIB } from './sizing';
import type { ConstantKey, SizingConstants, SizingInputs, SizingResult } from './sizing';
import { DEFAULT_CONSTANT_STRINGS, readFormState, validateForm, writeFormState } from './formState';
import type { FormState } from './formState';

const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function ResourceCalculator() {
  const [form, setForm] = useState<FormState>(() => readFormState(window.location.search));
  const [showCalculation, setShowCalculation] = useState(false);
  const validated = useMemo(() => validateForm(form), [form]);
  const { inputs, constants, errors } = validated;
  const result = inputs && constants ? computeSizing(inputs, constants) : null;

  // Keep the query string in sync so the page can be bookmarked or shared.
  useEffect(() => {
    const url = window.location.pathname + writeFormState(form) + window.location.hash;
    window.history.replaceState(window.history.state, '', url);
  }, [form]);

  const setField = (field: 'activeSeries' | 'scrapeInterval' | 'retentionDays', value: string) =>
    setForm((f) => ({ ...f, [field]: value }));
  const setConstant = (key: ConstantKey, value: string) =>
    setForm((f) => ({ ...f, constants: { ...f.constants, [key]: value } }));
  const resetConstants = () => setForm((f) => ({ ...f, constants: DEFAULT_CONSTANT_STRINGS }));

  const chartInterval = errors.scrapeInterval ? null : Number(form.scrapeInterval);

  return (
    <div>
      <Container>
        <div className="d-flex flex-column gap-4">
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex flex-column gap-3">
                <div>
                  <h5 className="mb-3">Enter your configuration:</h5>
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <div className="d-flex gap-2 align-items-center mb-2">
                        <label className="form-label mb-0 fw-semibold" htmlFor="active-series">Active Time Series</label>
                        <Badge bg="danger">Required</Badge>
                      </div>
                      <Form.Control
                        id="active-series"
                        type="number"
                        placeholder="e.g., 2000000"
                        min={1000}
                        step={1000}
                        value={form.activeSeries}
                        onChange={(e) => setField('activeSeries', e.target.value)}
                        isInvalid={!!errors.activeSeries}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.activeSeries}
                      </Form.Control.Feedback>
                      <small className="text-muted">
                        The number of unique time series your Prometheus instance tracks
                        (<code>prometheus_tsdb_head_series</code>)
                      </small>
                    </div>

                    <div className="d-flex gap-3 flex-wrap">
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <label className="form-label fw-semibold" htmlFor="scrape-interval">Scrape Interval (seconds)</label>
                        <Form.Control
                          id="scrape-interval"
                          type="number"
                          min={1}
                          step={1}
                          value={form.scrapeInterval}
                          onChange={(e) => setField('scrapeInterval', e.target.value)}
                          isInvalid={!!errors.scrapeInterval}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.scrapeInterval}
                        </Form.Control.Feedback>
                        <small className="text-muted">
                          How often Prometheus scrapes metrics
                        </small>
                      </div>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <label className="form-label fw-semibold" htmlFor="retention-days">Retention Period (days)</label>
                        <Form.Control
                          id="retention-days"
                          type="number"
                          min={1}
                          step={1}
                          value={form.retentionDays}
                          onChange={(e) => setField('retentionDays', e.target.value)}
                          isInvalid={!!errors.retentionDays}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.retentionDays}
                        </Form.Control.Feedback>
                        <small className="text-muted">
                          How long to keep data on disk
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                {result && inputs && constants && (
                  <InfoBox>
                    <Results inputs={inputs} constants={constants} result={result} />
                    <div className="pt-3">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0"
                        onClick={() => setShowCalculation(!showCalculation)}
                        aria-expanded={showCalculation}
                        aria-controls="calculation-steps"
                      >
                        {showCalculation ? 'Hide calculation' : 'Show calculation'}
                      </Button>
                      <Collapse in={showCalculation}>
                        <div id="calculation-steps">
                          <CalculationSteps inputs={inputs} constants={constants} result={result} />
                        </div>
                      </Collapse>
                    </div>
                  </InfoBox>
                )}

                <AssumptionsPanel
                  values={form.constants}
                  errors={errors.constants}
                  modified={validated.modified}
                  onChange={setConstant}
                  onReset={resetConstants}
                />
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex flex-column gap-3">
                <h5 className="fw-semibold mb-0">Memory Requirements by Time Series</h5>
                <small className="text-muted">
                  Holding the scrape interval and assumptions constant. Hover over a dot for details.
                </small>
                {constants && chartInterval ? (
                  <MemoryChart
                    constants={constants}
                    scrapeIntervalSec={chartInterval}
                    userSeries={inputs?.activeSeries ?? null}
                  />
                ) : (
                  <small className="text-muted">Fix the highlighted values to see the chart.</small>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
}

interface ResultProps {
  inputs: SizingInputs;
  constants: SizingConstants;
  result: SizingResult;
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <small className="text-muted">{label}</small>
      <h3 className="fw-bold mb-0">{value}</h3>
      {note && <small className="text-muted">{note}</small>}
    </div>
  );
}

function Results({ inputs, constants, result: r }: ResultProps) {
  const manifest = [
    'resources:',
    '  requests:',
    `    cpu: "${r.cpuCores}"`,
    `    memory: ${formatGi(r.requestGi)}`,
    '  limits:',
    `    memory: ${formatGi(r.limitGi)}`,
    'env:',
    '  - name: GOMEMLIMIT',
    `    value: ${r.gomemlimitMiB}MiB`,
  ].join('\n');

  return (
    <div className="d-flex flex-column gap-3">
      <h5 className="fw-bold mb-0">
        For {fmt(inputs.activeSeries)} active time series at {fmt(inputs.scrapeIntervalSec)}s
        with {fmt(inputs.retentionDays)} days of retention:
      </h5>
      <div className="d-flex gap-4 flex-wrap">
        <Stat
          label="Memory Limit"
          value={formatGi(r.limitGi)}
          note={`${fmt(r.limitBytes / inputs.activeSeries / KIB, 2)} KiB per series`}
        />
        <Stat label="Memory Request" value={formatGi(r.requestGi)} note={`${constants.requestPercent}% of limit`} />
        <Stat label="GOMEMLIMIT" value={`${fmt(r.gomemlimitMiB)}MiB`} note={`${constants.gomemlimitPercent}% of limit`} />
        <Stat
          label="Disk (PV size)"
          value={`${fmt(r.diskGi)}Gi`}
          note={r.diskGi >= 1024 ? `${fmt(r.diskGi / 1024, 2)} TiB` : undefined}
        />
        <Stat label="CPU Cores" value={String(r.cpuCores)} note="Rough guide" />
      </div>
      <div>
        <small className="text-muted">Kubernetes container settings:</small>
        <pre className="border rounded p-2 mb-1 small">{manifest}</pre>
        <small className="text-muted">
          Prometheus 3.x sets GOMEMLIMIT for you with <code>--auto-gomemlimit</code> at a ratio
          of 0.9. To match this model, pass{' '}
          <code>--auto-gomemlimit.ratio={(constants.gomemlimitPercent / 100).toFixed(2)}</code>{' '}
          instead of setting the variable. CPU is a rough guide based on GCP VM memory to CPU
          ratios and tends to over forecast.
        </small>
      </div>
    </div>
  );
}

function CalculationSteps({ inputs, constants: c, result: r }: ResultProps) {
  const S = fmt(inputs.activeSeries);
  const rows: [string, string, string][] = [
    ['Head samples per series', `${c.headWindowHours} h x 3600 / ${inputs.scrapeIntervalSec}s`, fmt(r.headSamplesPerSeries, 1)],
    ['Bytes per series', `${c.indexBytesPerSeries} B + ${fmt(r.headSamplesPerSeries, 1)} x ${c.memoryBytesPerSample} B`, `${fmt(r.bytesPerSeries)} B`],
    ['Base heap', `${S} series x ${fmt(r.bytesPerSeries)} B`, formatBytes(r.baseHeapBytes)],
    ['Working set', `base heap x ${c.operationalMultiplier}`, formatBytes(r.workingSetBytes)],
    ['Safety buffer', `working set x ${c.safetyMultiplier}`, formatBytes(r.safetyBufferBytes)],
    ['Minimum buffer', `working set + ${c.minBufferGiB} GiB`, formatBytes(r.flatBufferBytes)],
    [
      'Memory limit',
      `larger of the two (${r.bufferRule === 'multiplier' ? 'safety buffer' : 'minimum buffer'}) is ${formatBytes(r.limitBytes)}, rounded up`,
      formatGi(r.limitGi),
    ],
    ['Memory request', `${formatGi(r.limitGi)} x ${c.requestPercent}%, rounded up`, formatGi(r.requestGi)],
    ['GOMEMLIMIT', `${formatGi(r.limitGi)} x ${c.gomemlimitPercent}%, rounded down`, `${fmt(r.gomemlimitMiB)}MiB`],
    ['CPU cores', `max(${c.minCores}, round(${r.limitGi.toFixed(1)} / ${c.memoryPerCoreGiB}))`, String(r.cpuCores)],
    ['Samples on disk', `${S} / ${inputs.scrapeIntervalSec}s x ${inputs.retentionDays} days x 86400`, fmt(r.totalSamples)],
    ['Raw disk', `samples x ${c.diskBytesPerSample} B`, formatBytes(r.rawDiskBytes)],
    ['Disk (PV size)', `raw disk x ${fmt(1 + c.diskBufferPercent / 100, 2)} is ${fmt(r.provisionedDiskBytes / GIB, 1)} GiB, rounded up`, `${fmt(r.diskGi)}Gi`],
  ];

  return (
    <Table size="sm" responsive className="mt-2 mb-0 small">
      <thead>
        <tr>
          <th>Step</th>
          <th>Formula</th>
          <th className="text-end">Value</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([step, formula, value]) => (
          <tr key={step}>
            <td>{step}</td>
            <td><code>{formula}</code></td>
            <td className="text-end text-nowrap">{value}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
