import { useState } from 'react';
import { Container, Form, Button, Card, Alert, Accordion, Badge, Nav, Tab } from 'react-bootstrap';
import { IconClipboardList, IconUpload, IconTarget, IconHeartbeat, IconBell, IconCopy, IconDownload } from '@tabler/icons-react';
import * as yaml from 'js-yaml';
import { InfoBox } from './components/InfoBox';

const enableAds = false;

interface FormValues {
  appName: string;
  sloEnabled: boolean;
  sloType: string;
  sloTarget: number;
  evaluationInterval: string;
  livenessThreshold: number;
  livenessQuery: string;
  livenessAvailabilityThreshold: number;
  errorBudgetWindow: string;
  errorQuery: string;
  totalQuery: string;
  customAlertLabels: string;
  customAlertAnnotations: string;
}

interface FormErrors {
  appName?: string;
  sloType?: string;
  livenessQuery?: string;
  errorQuery?: string;
  totalQuery?: string;
}

export default function PrometheusRuleGenerator() {
  const [generatedPrometheus, setGeneratedPrometheus] = useState('');
  const [generatedConfig, setGeneratedConfig] = useState('');
  const [uploadError, setUploadError] = useState('');

  const [formValues, setFormValues] = useState<FormValues>({
    appName: '',
    sloEnabled: true,
    sloType: 'availability',
    sloTarget: 99.9,
    evaluationInterval: '1m',
    livenessThreshold: 5,
    livenessQuery: '',
    livenessAvailabilityThreshold: 80,
    errorBudgetWindow: '30d',
    errorQuery: '',
    totalQuery: '',
    customAlertLabels: '',
    customAlertAnnotations: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Validation function for PromQL metric patterns
  const validatePromQLMetric = (value: string): string | null => {
    if (!value || !value.trim()) {
      return null; // Empty is allowed (will use default)
    }

    const query = value.trim();

    // Basic pattern: metric_name followed by optional {labels}
    // Metric name: [a-zA-Z_:][a-zA-Z0-9_:]*
    const metricPattern = /^[a-zA-Z_:][a-zA-Z0-9_:]*(\{[^}]+\})?$/;

    if (!metricPattern.test(query)) {
      return 'Invalid metric format. Expected: metric_name{label="value"} or just metric_name';
    }

    // If it has labels, validate the label syntax
    const labelsMatch = query.match(/\{([^}]+)\}/);
    if (labelsMatch) {
      const labelsString = labelsMatch[1];
      const labelPairs = labelsString.split(',').map(s => s.trim());

      for (const pair of labelPairs) {
        // Label pattern: label_name="value" or label_name=~"regex" or label_name!="value" or label_name!~"regex"
        const labelPattern = /^[a-zA-Z_][a-zA-Z0-9_]*\s*(=~?|!=~?)\s*"[^"]*"$/;
        if (!labelPattern.test(pair.trim())) {
          return `Invalid label syntax: "${pair}". Expected: label="value" or label=~"pattern"`;
        }
      }
    }

    return null; // Valid
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formValues.appName.trim()) {
      newErrors.appName = 'Application name is required';
    }

    if (!formValues.sloType.trim()) {
      newErrors.sloType = 'SLO type is required';
    }

    const livenessError = validatePromQLMetric(formValues.livenessQuery);
    if (livenessError) {
      newErrors.livenessQuery = livenessError;
    }

    const errorQueryError = validatePromQLMetric(formValues.errorQuery);
    if (errorQueryError) {
      newErrors.errorQuery = errorQueryError;
    }

    const totalQueryError = validatePromQLMetric(formValues.totalQuery);
    if (totalQueryError) {
      newErrors.totalQuery = totalQueryError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateFormValue = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
    // Clear error for this field when user updates it
    if (errors[key as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  // Calculate allowed downtime based on SLO target
  const calculateDowntime = (sloPercent: number) => {
    const downtimePercent = 100 - sloPercent;
    const minutesPerMonth = 43200; // 30 days * 24 hours * 60 minutes
    const minutesPerYear = 525600; // 365 days * 24 hours * 60 minutes

    const downtimeMinutesMonth = (downtimePercent / 100) * minutesPerMonth;
    const downtimeMinutesYear = (downtimePercent / 100) * minutesPerYear;

    // Format based on magnitude
    const formatTime = (minutes: number) => {
      if (minutes < 1) {
        return `${(minutes * 60).toFixed(1)}s`;
      } else if (minutes < 60) {
        return `${minutes.toFixed(1)}m`;
      } else {
        const hours = minutes / 60;
        return `${hours.toFixed(1)}h`;
      }
    };

    return {
      perMonth: formatTime(downtimeMinutesMonth),
      perYear: formatTime(downtimeMinutesYear),
    };
  };

  const generateRules = () => {
    // Validate form before generating
    if (!validateForm()) {
      return;
    }

    const { appName, sloEnabled, sloTarget, evaluationInterval, livenessThreshold, livenessQuery,
            livenessAvailabilityThreshold, errorBudgetWindow, errorQuery, totalQuery, customAlertLabels, customAlertAnnotations } = formValues;

    // Parse custom alert labels and annotations
    const parseCustomFields = (fieldsText: string): string => {
      if (!fieldsText.trim()) return '';

      const lines = fieldsText.split('\n').filter(line => line.trim());
      const fieldLines = lines
        .map(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            return `          ${key.trim()}: ${value}`;
          }
          return null;
        })
        .filter(Boolean);

      return fieldLines.length > 0 ? '\n' + fieldLines.join('\n') : '';
    };

    const customLabelsFormatted = parseCustomFields(customAlertLabels);
    const customAnnotationsFormatted = parseCustomFields(customAlertAnnotations);

    const defaultLivenessQuery = `up{job="${appName}"}`;
    const effectiveLivenessQuery = livenessQuery || defaultLivenessQuery;
    const availabilityThresholdDecimal = livenessAvailabilityThreshold / 100;

    // Use default raw metric names if user hasn't provided custom ones
    const defaultErrorMetric = `http_requests_total{job="${appName}",code=~"5.."}`;
    const defaultTotalMetric = `http_requests_total{job="${appName}"}`;

    const effectiveErrorMetric = errorQuery || defaultErrorMetric;
    const effectiveTotalMetric = totalQuery || defaultTotalMetric;

    // Wrap user's raw metrics with sum(rate()) for different time windows
    const errorQuery5m = `sum(rate(${effectiveErrorMetric}[5m]))`;
    const totalQuery5m = `sum(rate(${effectiveTotalMetric}[5m]))`;
    const errorQuery1h = `sum(rate(${effectiveErrorMetric}[1h]))`;
    const totalQuery1h = `sum(rate(${effectiveTotalMetric}[1h]))`;
    const errorQuery6h = `sum(rate(${effectiveErrorMetric}[6h]))`;
    const totalQuery6h = `sum(rate(${effectiveTotalMetric}[6h]))`;

    // Generate Prometheus Rules
    let prometheusYaml = `groups:
  - name: ${appName}_monitoring
    interval: ${evaluationInterval}
    rules:`;

    // Add SLO recording rules first if enabled
    if (sloEnabled) {
      const sloTargetDecimal = Math.round((sloTarget / 100) * 1000000) / 1000000;

      prometheusYaml += `
      # ========================================
      # Recording Rules - SLO Metrics
      # ========================================

      # SLO Goal (constant)
      - record: job:slo_goal:ratio
        expr: ${sloTargetDecimal}
        labels:
          job: ${appName}
          slo_type: ${formValues.sloType}

      # Success ratio over 5m window
      - record: job:slo:ratio_rate5m
        expr: |
          (
            (${totalQuery5m}) - (${errorQuery5m})
          )
          /
          (${totalQuery5m})
        labels:
          job: ${appName}
          slo_type: ${formValues.sloType}

      # Success ratio over 1h window (for fast burn detection)
      - record: job:slo:ratio_rate1h
        expr: |
          (
            (${totalQuery1h}) - (${errorQuery1h})
          )
          /
          (${totalQuery1h})
        labels:
          job: ${appName}
          slo_type: ${formValues.sloType}

      # Success ratio over 6h window (for slow burn detection)
      - record: job:slo:ratio_rate6h
        expr: |
          (
            (${totalQuery6h}) - (${errorQuery6h})
          )
          /
          (${totalQuery6h})
        labels:
          job: ${appName}
          slo_type: ${formValues.sloType}

      # Error ratio over 5m window (for error budget tracking)
      - record: job:slo_burn:ratio_5m
        expr: |
          (${errorQuery5m})
          /
          (${totalQuery5m})
        labels:
          job: ${appName}
          slo_type: ${formValues.sloType}

      # Error ratio over 1h window (for fast burn rate)
      - record: job:slo_burn:ratio_1h
        expr: |
          (${errorQuery1h})
          /
          (${totalQuery1h})
        labels:
          job: ${appName}
          slo_type: ${formValues.sloType}

      # Error ratio over 6h window (for slow burn rate)
      - record: job:slo_burn:ratio_6h
        expr: |
          (${errorQuery6h})
          /
          (${totalQuery6h})
        labels:
          job: ${appName}
          slo_type: ${formValues.sloType}

      # Error budget remaining (uses 5m error rate samples over the budget window)
      - record: job:error_budget:remaining_ratio_${errorBudgetWindow}
        expr: |
          1 - (
            avg_over_time(job:slo_burn:ratio_5m{job="${appName}",slo_type="${formValues.sloType}"}[${errorBudgetWindow}])
            /
            (1 - job:slo_goal:ratio{job="${appName}",slo_type="${formValues.sloType}"})
          )
        labels:
          job: ${appName}
          slo_type: ${formValues.sloType}
`;
    }

    // Add alerts
    prometheusYaml += `
      # ========================================
      # Alerts
      # ========================================

      # Liveness / Availability Alert
      - alert: ${appName}Down
        expr: |
          avg(${effectiveLivenessQuery}) < ${availabilityThresholdDecimal}
        for: ${livenessThreshold}m
        labels:
          severity: critical
          component: ${appName}
          alert_type: liveness${customLabelsFormatted}
        annotations:
          summary: "${appName} availability below ${livenessAvailabilityThreshold}%"
          description: "Less than ${livenessAvailabilityThreshold}% of ${appName} instances are up. Current availability: {{ $value | humanizePercentage }}"${customAnnotationsFormatted}`;

    // Add SLO alerts if enabled
    if (sloEnabled) {
      prometheusYaml += `

      # SLO Breach Alert - Full error budget exhausted over the SLO window
      - alert: ${appName}SLOBreach
        expr: |
          job:error_budget:remaining_ratio_${errorBudgetWindow}{job="${appName}",slo_type="${formValues.sloType}"} < 0
        for: 5m
        labels:
          severity: warning
          component: ${appName}
          alert_type: slo_breach
          slo_type: ${formValues.sloType}${customLabelsFormatted}
        annotations:
          summary: "${appName} ${formValues.sloType} SLO breach - error budget exhausted"
          description: "The ${appName} ${formValues.sloType} SLO has been violated. Error budget for the ${errorBudgetWindow} window has been completely exhausted. The ${sloTarget}% availability target has not been met. Remaining budget: {{ $value | humanizePercentage }}."${customAnnotationsFormatted}

      # Error Budget Fast Burn Alert
      - alert: ${appName}ErrorBudgetFastBurn
        expr: |
          job:slo_burn:ratio_1h{job="${appName}",slo_type="${formValues.sloType}"} > ((1 - job:slo_goal:ratio{job="${appName}",slo_type="${formValues.sloType}"}) * 14.4)
        for: 2m
        labels:
          severity: critical
          component: ${appName}
          alert_type: error_budget_burn
          slo_type: ${formValues.sloType}
          burn_rate: fast${customLabelsFormatted}
        annotations:
          summary: "${appName} ${formValues.sloType} SLO is burning error budget rapidly"
          description: "Fast burn rate detected for ${formValues.sloType} SLO. At this rate, the entire ${errorBudgetWindow} error budget will be exhausted in ~2 days. Current error rate: {{ $value | humanizePercentage }}."${customAnnotationsFormatted}

      # Error Budget Slow Burn Alert
      - alert: ${appName}ErrorBudgetSlowBurn
        expr: |
          job:slo_burn:ratio_6h{job="${appName}",slo_type="${formValues.sloType}"} > ((1 - job:slo_goal:ratio{job="${appName}",slo_type="${formValues.sloType}"}) * 6)
        for: 15m
        labels:
          severity: warning
          component: ${appName}
          alert_type: error_budget_burn
          slo_type: ${formValues.sloType}
          burn_rate: slow${customLabelsFormatted}
        annotations:
          summary: "${appName} ${formValues.sloType} SLO is burning error budget steadily"
          description: "Slow burn rate detected for ${formValues.sloType} SLO. At this rate, the entire ${errorBudgetWindow} error budget will be exhausted in ~5 days. Current error rate: {{ $value | humanizePercentage }}."${customAnnotationsFormatted}`;
    }

    // Generate configuration spec for saving/resuming work
    // Use effective values (with defaults applied) so config captures actual state
    const configYaml = `# Prometheus Alert Rule Generator Configuration
# Save this file to resume your work later
version: "1.0"
application:
  name: "${appName}"

liveness:
  query: "${effectiveLivenessQuery}"
  availability_threshold: ${livenessAvailabilityThreshold}
  alert_duration_minutes: ${livenessThreshold}

# SLOs is an array to support multiple SLOs in the future
slos:${sloEnabled ? `
  - enabled: true
    type: "${formValues.sloType}"
    target: ${sloTarget}
    error_metric: "${effectiveErrorMetric}"
    total_metric: "${effectiveTotalMetric}"
    error_budget_window: "${errorBudgetWindow}"` : ' []'}

alerts:
  evaluation_interval: "${evaluationInterval}"${customAlertLabels ? `
  custom_labels: |
${customAlertLabels.split('\n').map((line: string) => `    ${line}`).join('\n')}` : ''}${customAlertAnnotations ? `
  custom_annotations: |
${customAlertAnnotations.split('\n').map((line: string) => `    ${line}`).join('\n')}` : ''}`;

    setGeneratedPrometheus(prometheusYaml);
    setGeneratedConfig(configYaml);
  };

  const handleConfigUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = yaml.load(text);

      // Extract values from config spec and update form
      const config = parsed as any;
      const firstSlo = config.slos?.[0];

      setFormValues({
        appName: config.application?.name || formValues.appName,
        livenessQuery: config.liveness?.query || formValues.livenessQuery,
        livenessAvailabilityThreshold: config.liveness?.availability_threshold ?? formValues.livenessAvailabilityThreshold,
        livenessThreshold: config.liveness?.alert_duration_minutes ?? formValues.livenessThreshold,
        sloEnabled: (config.slos && config.slos.length > 0 && firstSlo?.enabled) ?? formValues.sloEnabled,
        sloType: firstSlo?.type || formValues.sloType,
        sloTarget: firstSlo?.target ?? formValues.sloTarget,
        errorQuery: firstSlo?.error_metric || formValues.errorQuery,
        totalQuery: firstSlo?.total_metric || formValues.totalQuery,
        errorBudgetWindow: firstSlo?.error_budget_window || formValues.errorBudgetWindow,
        evaluationInterval: config.alerts?.evaluation_interval || formValues.evaluationInterval,
        customAlertLabels: config.alerts?.custom_labels?.trim() || formValues.customAlertLabels,
        customAlertAnnotations: config.alerts?.custom_annotations?.trim() || formValues.customAlertAnnotations,
      });

      setUploadError('');
      // Auto-generate rules with loaded values
      setTimeout(generateRules, 100);

    } catch (error: any) {
      setUploadError(`Failed to parse configuration YAML: ${error.message}`);
    }

    // Reset the input so the same file can be uploaded again
    event.target.value = '';
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Container>
        <div className="d-flex flex-column gap-4">
          {/* Top Banner Ad Placement */}
          {enableAds && (
            <Card style={{ textAlign: 'center', minHeight: '90px' }}>
              <Card.Body className="d-flex align-items-center justify-content-center">
                <div id="carbon-ads-top" style={{ width: '100%' }}>
                  <small className="text-muted">Advertisement</small>
                </div>
              </Card.Body>
            </Card>
          )}

          <Card>
            <Card.Body className="p-4">
              <div className="d-flex flex-column gap-4">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h2 style={{ fontSize: '1.75rem' }}>Configuration</h2>
                    <p className="text-muted mb-0">Configure your application monitoring and SLO parameters</p>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept=".yaml,.yml"
                      onChange={handleConfigUpload}
                      style={{ display: 'none' }}
                      id="config-upload"
                    />
                    <label htmlFor="config-upload">
                      <Button as="span" variant="outline-primary">
                        <IconUpload size={18} className="me-2" />
                        Upload Config
                      </Button>
                    </label>
                  </div>
                </div>

                {uploadError && (
                  <Alert variant="danger">
                    <Alert.Heading>Upload Error</Alert.Heading>
                    {uploadError}
                  </Alert>
                )}

                {/* Basic Configuration */}
                <Card bg="light" border="light">
                  <Card.Body>
                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <IconClipboardList size={22} style={{ color: '#0d6efd' }} />
                        <h4 className="mb-0" style={{ fontSize: '1.1rem' }}>Basic Information</h4>
                        <Badge bg="danger">Required</Badge>
                      </div>

                      <Form.Group>
                        <Form.Label style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                          Application Name / Job Name <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="my-api"
                          value={formValues.appName}
                          onChange={(e) => updateFormValue('appName', e.target.value)}
                          isInvalid={!!errors.appName}
                        />
                        <Form.Text className="text-muted">
                          Used as the job label in queries and as the base name for all generated rules and alerts
                        </Form.Text>
                        <Form.Control.Feedback type="invalid">{errors.appName}</Form.Control.Feedback>
                      </Form.Group>
                    </div>
                  </Card.Body>
                </Card>

                {/* Accordion for Advanced Settings */}
                <Accordion defaultActiveKey={['0', '1', '2']} alwaysOpen>
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>
                      <IconHeartbeat size={20} className="me-2" />
                      Liveness / Availability Settings
                    </Accordion.Header>
                    <Accordion.Body>
                      <div className="d-flex flex-column gap-3">
                        <Form.Group>
                          <Form.Label style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Liveness PromQL Query
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder={`up{job="${formValues.appName || 'my-app'}"}`}
                            value={formValues.livenessQuery}
                            onChange={(e) => updateFormValue('livenessQuery', e.target.value)}
                            isInvalid={!!errors.livenessQuery}
                            style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                          />
                          <Form.Text className="text-muted">
                            PromQL expression that returns 1 (up) or 0 (down) for each instance. Defaults to up{'{'}job='...'{'}'}  using the Application Name above if left empty.
                          </Form.Text>
                          <Form.Control.Feedback type="invalid">{errors.livenessQuery}</Form.Control.Feedback>
                        </Form.Group>

                        <Card bg="light">
                          <Card.Body>
                            <div className="d-flex flex-column gap-2">
                              <div>
                                <strong>Minimum Availability Threshold: {formValues.livenessAvailabilityThreshold}%</strong>
                              </div>
                              <small className="text-muted">
                                Alert when less than this percentage of instances are up (based on avg of liveness query)
                              </small>
                              <Form.Range
                                value={formValues.livenessAvailabilityThreshold}
                                onChange={(e) => updateFormValue('livenessAvailabilityThreshold', parseInt(e.target.value))}
                                min={0}
                                max={100}
                                step={5}
                              />
                              <div className="d-flex justify-content-between">
                                <small>0%</small>
                                <small>50%</small>
                                <small>80%</small>
                                <small>100%</small>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>

                        <Form.Group>
                          <Form.Label style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Liveness Alert Duration (minutes)
                          </Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            max={60}
                            value={formValues.livenessThreshold}
                            onChange={(e) => updateFormValue('livenessThreshold', parseInt(e.target.value))}
                          />
                          <Form.Text className="text-muted">
                            How long availability must be below threshold before alerting
                          </Form.Text>
                        </Form.Group>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>

                  <Accordion.Item eventKey="1">
                    <Accordion.Header>
                      <IconTarget size={20} className="me-2" />
                      SLO Settings (Optional)
                    </Accordion.Header>
                    <Accordion.Body>
                      <div className="d-flex flex-column gap-3">
                        <Form.Check
                          type="switch"
                          id="slo-enabled"
                          label="Generate SLO-based alerts"
                          checked={formValues.sloEnabled}
                          onChange={(e) => updateFormValue('sloEnabled', e.target.checked)}
                        />
                        <Form.Text className="text-muted d-block">
                          Enable to generate error budget burn rate alerts
                        </Form.Text>

                        <Form.Group>
                          <Form.Label style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            SLO Type
                          </Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="availability"
                            value={formValues.sloType}
                            onChange={(e) => updateFormValue('sloType', e.target.value)}
                            disabled={!formValues.sloEnabled}
                            isInvalid={!!errors.sloType}
                          />
                          <Form.Text className="text-muted">
                            Type of SLO for labeling (e.g., 'availability', 'latency', 'correctness'). Used to differentiate multiple SLOs for the same service.
                          </Form.Text>
                          <Form.Control.Feedback type="invalid">{errors.sloType}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group>
                          <Form.Label style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Error Metric (Counter)
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            placeholder={`http_requests_total{job="${formValues.appName || 'my-app'}",code=~"5.."}`}
                            value={formValues.errorQuery}
                            onChange={(e) => updateFormValue('errorQuery', e.target.value)}
                            disabled={!formValues.sloEnabled}
                            isInvalid={!!errors.errorQuery}
                            style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                          />
                          <Form.Text className="text-muted">
                            Raw Prometheus Counter metric for 'bad' events. Just provide the metric name and labels - we'll automatically wrap it with sum(rate()). Defaults to HTTP 5xx errors if left empty.
                          </Form.Text>
                          <Form.Control.Feedback type="invalid">{errors.errorQuery}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group>
                          <Form.Label style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Total Metric (Counter)
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            placeholder={`http_requests_total{job="${formValues.appName || 'my-app'}"}`}
                            value={formValues.totalQuery}
                            onChange={(e) => updateFormValue('totalQuery', e.target.value)}
                            disabled={!formValues.sloEnabled}
                            isInvalid={!!errors.totalQuery}
                            style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                          />
                          <Form.Text className="text-muted">
                            Raw Prometheus Counter metric for total events. Just provide the metric name and labels - we'll automatically wrap it with sum(rate()). Defaults to all HTTP requests if left empty.
                          </Form.Text>
                          <Form.Control.Feedback type="invalid">{errors.totalQuery}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group>
                          <Form.Label style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            SLO Target
                          </Form.Label>
                          <Form.Select
                            value={formValues.sloTarget.toString()}
                            onChange={(e) => updateFormValue('sloTarget', parseFloat(e.target.value))}
                            disabled={!formValues.sloEnabled}
                          >
                            <option value="95">95% (one nine)</option>
                            <option value="99">99% (two nines)</option>
                            <option value="99.9">99.9% (three nines)</option>
                            <option value="99.99">99.99% (four nines)</option>
                            <option value="99.999">99.999% (five nines)</option>
                          </Form.Select>
                          <Form.Text className="text-muted">
                            Target availability/reliability percentage based on industry-standard SLO tiers
                          </Form.Text>
                        </Form.Group>

                        {formValues.sloEnabled && (() => {
                          const downtime = calculateDowntime(formValues.sloTarget);
                          return (
                            <InfoBox>
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <small className="text-muted d-block mb-2" style={{ fontWeight: 600 }}>ALLOWED DOWNTIME</small>
                                  <div className="d-flex gap-4">
                                    <div>
                                      <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Per Month</small>
                                      <strong style={{ fontSize: '1.25rem' }}>{downtime.perMonth}</strong>
                                    </div>
                                    <div>
                                      <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Per Year</small>
                                      <strong style={{ fontSize: '1.25rem' }}>{downtime.perYear}</strong>
                                    </div>
                                  </div>
                                </div>
                                <small className="text-muted" style={{ maxWidth: '200px' }}>
                                  Maximum acceptable downtime for {formValues.sloTarget}% SLO target
                                </small>
                              </div>
                            </InfoBox>
                          );
                        })()}

                        <Form.Group>
                          <Form.Label style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Error Budget Window
                          </Form.Label>
                          <Form.Select
                            value={formValues.errorBudgetWindow}
                            onChange={(e) => updateFormValue('errorBudgetWindow', e.target.value)}
                            disabled={!formValues.sloEnabled}
                          >
                            <option value="7d">7 days</option>
                            <option value="30d">30 days</option>
                            <option value="90d">90 days</option>
                          </Form.Select>
                          <Form.Text className="text-muted">
                            Time window for error budget calculations
                          </Form.Text>
                        </Form.Group>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>

                  <Accordion.Item eventKey="2">
                    <Accordion.Header>
                      <IconBell size={20} className="me-2" />
                      Alert Settings
                    </Accordion.Header>
                    <Accordion.Body>
                      <div className="d-flex flex-column gap-3">
                        <Form.Group>
                          <Form.Label style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Evaluation Interval
                          </Form.Label>
                          <Form.Select
                            value={formValues.evaluationInterval}
                            onChange={(e) => updateFormValue('evaluationInterval', e.target.value)}
                          >
                            <option value="30s">30 seconds</option>
                            <option value="1m">1 minute</option>
                            <option value="2m">2 minutes</option>
                            <option value="5m">5 minutes</option>
                          </Form.Select>
                          <Form.Text className="text-muted">
                            How often Prometheus evaluates these rules
                          </Form.Text>
                        </Form.Group>

                        <Form.Group>
                          <Form.Label style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Additional Alert Labels (Optional)
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="team: sre&#10;squad: platform&#10;priority: high"
                            value={formValues.customAlertLabels}
                            onChange={(e) => updateFormValue('customAlertLabels', e.target.value)}
                            style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                          />
                          <Form.Text className="text-muted">
                            Custom labels to add to all alerts. Perfect for routing labels (team, squad), or any metadata needed for alert management. Format: one per line as key: value
                          </Form.Text>
                        </Form.Group>

                        <Form.Group>
                          <Form.Label style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Additional Alert Annotations (Optional)
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="runbook_url: https://wiki.example.com/runbooks&#10;dashboard_url: https://grafana.example.com/d/app-overview"
                            value={formValues.customAlertAnnotations}
                            onChange={(e) => updateFormValue('customAlertAnnotations', e.target.value)}
                            style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                          />
                          <Form.Text className="text-muted">
                            Custom annotations to add to all alerts. Perfect for documentation links (runbook_url, dashboard), or contextual information. Format: one per line as key: value
                          </Form.Text>
                        </Form.Group>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>

                <Button
                  onClick={generateRules}
                  size="lg"
                  disabled={!formValues.appName}
                  className="w-100"
                >
                  Generate Rules
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Mid-Page Ad Placement - Shows after form submission */}
          {enableAds && generatedPrometheus && (
            <Card style={{ textAlign: 'center', minHeight: '90px' }}>
              <Card.Body className="d-flex align-items-center justify-content-center">
                <div id="carbon-ads-mid" style={{ width: '100%' }}>
                  <small className="text-muted">Advertisement</small>
                </div>
              </Card.Body>
            </Card>
          )}

          {generatedPrometheus && (
            <Card>
              <Card.Body className="p-4">
                <Tab.Container defaultActiveKey="prometheus">
                  <Nav variant="tabs" className="mb-3">
                    <Nav.Item>
                      <Nav.Link eventKey="prometheus">Prometheus Rules</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="config">Configuration</Nav.Link>
                    </Nav.Item>
                  </Nav>

                  <Tab.Content>
                    <Tab.Pane eventKey="prometheus">
                      <div className="d-flex flex-column gap-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <h3>Prometheus Rules</h3>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              onClick={() => navigator.clipboard.writeText(generatedPrometheus)}
                            >
                              <IconCopy size={18} className="me-2" />
                              Copy
                            </Button>
                            <Button
                              variant="primary"
                              onClick={() => downloadFile(generatedPrometheus, `${formValues.appName}-prometheus-rules.yaml`)}
                            >
                              <IconDownload size={18} className="me-2" />
                              Download
                            </Button>
                          </div>
                        </div>

                        <pre style={{
                          whiteSpace: 'pre',
                          overflow: 'auto',
                          maxHeight: '600px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          padding: '1rem',
                          fontFamily: 'monospace',
                        }}>
                          <code>{generatedPrometheus}</code>
                        </pre>

                        <p className="text-muted mb-0">
                          <strong>Usage:</strong> Add this to your Prometheus configuration in the <code>rules</code> directory.
                          These rules include liveness checks, SLO breach detection, and multi-window burn rate alerts.
                        </p>
                      </div>
                    </Tab.Pane>

                    <Tab.Pane eventKey="config">
                      <div className="d-flex flex-column gap-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <h3>Configuration</h3>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              onClick={() => navigator.clipboard.writeText(generatedConfig)}
                            >
                              <IconCopy size={18} className="me-2" />
                              Copy
                            </Button>
                            <Button
                              variant="primary"
                              onClick={() => downloadFile(generatedConfig, `${formValues.appName}-config.yaml`)}
                            >
                              <IconDownload size={18} className="me-2" />
                              Download
                            </Button>
                          </div>
                        </div>

                        <pre style={{
                          whiteSpace: 'pre',
                          overflow: 'auto',
                          maxHeight: '600px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          padding: '1rem',
                          fontFamily: 'monospace',
                        }}>
                          <code>{generatedConfig}</code>
                        </pre>

                        <Alert variant="info">
                          <Alert.Heading>Save and Resume</Alert.Heading>
                          <p className="mb-0">
                            Download this configuration file to save your work. You can upload it later using the "Upload Config" button to resume where you left off.
                          </p>
                        </Alert>
                      </div>
                    </Tab.Pane>
                  </Tab.Content>
                </Tab.Container>

                <hr className="my-4" />

                <p className="text-muted mb-0">
                  <strong>Required Metrics:</strong>
                  <ul style={{ marginTop: '8px', marginBottom: '0' }}>
                    <li><code>{formValues.livenessQuery || `up{job="${formValues.appName}"}`}</code> - Liveness checks</li>
                    {formValues.sloEnabled && (
                      <>
                        <li><code>http_requests_total</code> - Request counter with <code>code</code> label</li>
                        <li><code>http_request_duration_seconds_bucket</code> - Latency histogram</li>
                      </>
                    )}
                  </ul>
                </p>
              </Card.Body>
            </Card>
          )}

          {/* Bottom Ad Placement - Shows after output */}
          {enableAds && generatedPrometheus && (
            <Card style={{ textAlign: 'center', minHeight: '90px' }}>
              <Card.Body className="d-flex align-items-center justify-content-center">
                <div id="carbon-ads-bottom" style={{ width: '100%' }}>
                  <small className="text-muted">Advertisement</small>
                </div>
              </Card.Body>
            </Card>
          )}
        </div>
      </Container>
    </div>
  );
}
