import { useState } from 'react';
import { Badge, Button, Col, Collapse, Form, InputGroup, Row } from 'react-bootstrap';
import { CONSTANT_FIELDS } from '../sizing';
import type { ConstantKey } from '../sizing';

export interface AssumptionsPanelProps {
  /** Constant values as typed */
  values: Record<ConstantKey, string>;
  errors: Partial<Record<ConstantKey, string>>;
  modified: boolean;
  onChange: (key: ConstantKey, value: string) => void;
  onReset: () => void;
}

/**
 * AssumptionsPanel - One line summary of the model constants with an
 * expandable settings area to change them.
 */
export function AssumptionsPanel({ values: v, errors, modified, onChange, onReset }: AssumptionsPanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-2">
      <small className="text-muted">
        {modified && <Badge bg="warning" text="dark" className="me-2">modified</Badge>}
        Assumes {v.indexBytesPerSeries} B index per series, {v.memoryBytesPerSample} B per sample
        over a {v.headWindowHours} hour head, {v.operationalMultiplier}x operational
        and {v.safetyMultiplier}x safety (at least +{v.minBufferGiB} GiB),
        GOMEMLIMIT {v.gomemlimitPercent}% and request {v.requestPercent}% of the limit,
        {' '}{v.diskBytesPerSample} B per sample on disk plus {v.diskBufferPercent}%,
        {' '}{v.memoryPerCoreGiB} GiB of memory per CPU core.
      </small>
      <div className="d-flex gap-3 flex-wrap">
        <Button
          variant="link"
          size="sm"
          className="p-0"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="assumptions-settings"
        >
          {open ? 'Hide assumptions' : 'Adjust assumptions'}
        </Button>
        <Button variant="link" size="sm" className="p-0" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
      </div>

      <Collapse in={open}>
        <div id="assumptions-settings">
          <Row className="g-3 pt-2">
            {CONSTANT_FIELDS.map((field) => (
              <Col key={field.key} sm={6} lg={4}>
                <Form.Group controlId={`assumption-${field.param}`}>
                  <Form.Label className="small fw-semibold mb-1">{field.label}</Form.Label>
                  <InputGroup size="sm" hasValidation>
                    <Form.Control
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={v[field.key]}
                      onChange={(e) => onChange(field.key, e.target.value)}
                      isInvalid={!!errors[field.key]}
                    />
                    <InputGroup.Text>{field.unit}</InputGroup.Text>
                    <Form.Control.Feedback type="invalid">{errors[field.key]}</Form.Control.Feedback>
                  </InputGroup>
                  <Form.Text muted>
                    {field.hint} Default {field.defaultValue}.
                  </Form.Text>
                </Form.Group>
              </Col>
            ))}
          </Row>
          <div className="pt-3">
            <Button variant="outline-secondary" size="sm" onClick={onReset} disabled={!modified}>
              Reset to defaults
            </Button>
          </div>
        </div>
      </Collapse>
    </div>
  );
}
