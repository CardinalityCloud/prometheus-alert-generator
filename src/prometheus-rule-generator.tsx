import React, { useState } from 'react';
import { MantineProvider, Container, Title, TextInput, Textarea, NumberInput, Select, Slider, Switch, Button, Paper, Code, Stack, Group, Text, Divider, Tabs, FileButton, Alert, Accordion, Badge, createTheme } from '@mantine/core';
import { IconClipboardList, IconUpload, IconTarget, IconHeartbeat, IconBell, IconCopy, IconDownload } from '@tabler/icons-react';
import * as yaml from 'js-yaml';

const theme = createTheme({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  primaryColor: 'blue',
  defaultRadius: 'md',
  colors: {
    blue: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#4dabf7',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab'
    ],
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
  components: {
    Paper: {
      defaultProps: {
        shadow: 'sm',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      styles: {
        input: {
          '&:focus': {
            borderColor: '#339af0',
          },
        },
      },
    },
  },
});

export default function PrometheusRuleGenerator() {
  const [appName, setAppName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [sloEnabled, setSloEnabled] = useState(true);
  const [sloTarget, setSloTarget] = useState(99.9);
  const [evaluationInterval, setEvaluationInterval] = useState('1m');
  const [livenessThreshold, setLivenessThreshold] = useState(5);
  const [livenessQuery, setLivenessQuery] = useState('');
  const [livenessAvailabilityThreshold, setLivenessAvailabilityThreshold] = useState(80);
  const [errorBudgetWindow, setErrorBudgetWindow] = useState('30d');
  const [errorQuery, setErrorQuery] = useState('');
  const [totalQuery, setTotalQuery] = useState('');
  const [customAlertLabels, setCustomAlertLabels] = useState('');
  const [generatedPrometheus, setGeneratedPrometheus] = useState('');
  const [generatedSloth, setGeneratedSloth] = useState('');
  const [uploadError, setUploadError] = useState('');

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
    const errorBudget = 100 - sloTarget;

    // Parse custom alert labels
    const parseCustomLabels = (labelsText: string): string => {
      if (!labelsText.trim()) return '';

      const lines = labelsText.split('\n').filter(line => line.trim());
      const labelLines = lines
        .map(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            return `          ${key.trim()}: ${value}`;
          }
          return null;
        })
        .filter(Boolean);

      return labelLines.length > 0 ? '\n' + labelLines.join('\n') : '';
    };

    const customLabelsFormatted = parseCustomLabels(customAlertLabels);

    // Build label selectors with optional namespace
    const namespaceLabel = namespace ? `, namespace="${namespace}"` : '';
    const defaultLivenessQuery = `up{job="${appName}"${namespaceLabel}}`;
    const effectiveLivenessQuery = livenessQuery || defaultLivenessQuery;
    const availabilityThresholdDecimal = livenessAvailabilityThreshold / 100;

    // Use default availability queries if user hasn't provided custom ones
    const defaultErrorQuery = `sum(rate(http_requests_total{job="${appName}"${namespaceLabel},code=~"5.."}[{{.window}}]))`;
    const defaultTotalQuery = `sum(rate(http_requests_total{job="${appName}"${namespaceLabel}}[{{.window}}]))`;

    const effectiveErrorQuery = errorQuery || defaultErrorQuery;
    const effectiveTotalQuery = totalQuery || defaultTotalQuery;

    // Replace {{.window}} with actual time windows for Prometheus rules
    const errorQuery5m = effectiveErrorQuery.replace(/\{\{\.window\}\}/g, '5m');
    const totalQuery5m = effectiveTotalQuery.replace(/\{\{\.window\}\}/g, '5m');
    const errorQuery1h = effectiveErrorQuery.replace(/\{\{\.window\}\}/g, '1h');
    const totalQuery1h = effectiveTotalQuery.replace(/\{\{\.window\}\}/g, '1h');
    const errorQuery6h = effectiveErrorQuery.replace(/\{\{\.window\}\}/g, '6h');
    const totalQuery6h = effectiveTotalQuery.replace(/\{\{\.window\}\}/g, '6h');
    const errorQueryWindow = effectiveErrorQuery;
    const totalQueryWindow = effectiveTotalQuery;

    // Generate Prometheus Rules - Always include liveness alert
    let prometheusYaml = `groups:
  - name: ${appName}_monitoring
    interval: ${evaluationInterval}
    rules:
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
          summary: "${appName} availability below ${livenessAvailabilityThreshold}% in ${namespace}"
          description: "Less than ${livenessAvailabilityThreshold}% of ${appName} instances are up. Current availability: {{ $value | humanizePercentage }}"`;

    // Add SLO rules only if enabled
    if (sloEnabled) {
      const successQuery5m = `(${totalQuery5m}) - (${errorQuery5m})`;

      prometheusYaml += `

      # SLO Recording Rule
      - record: ${appName}:slo:ratio_rate5m
        expr: |
          (${successQuery5m})
          /
          (${totalQuery5m})

      - alert: ${appName}SLOBreach
        expr: |
          (
            1 - ${appName}:slo:ratio_rate5m
          ) * 100 > ${errorBudget}
        for: 5m
        labels:
          severity: warning
          component: ${appName}
          alert_type: slo_breach${customLabelsFormatted}
        annotations:
          summary: "${appName} SLO breach"
          description: "Error rate for ${appName} is {{ $value | humanizePercentage }}, exceeding the error budget of ${errorBudget}% (SLO target: ${sloTarget}%)."

      # SLO: Error Budget Burn Rate (Fast Burn - 1h window)
      - alert: ${appName}ErrorBudgetFastBurn
        expr: |
          (
            (${errorQuery1h})
            /
            (${totalQuery1h})
          ) > (${errorBudget / 100} * 14.4)
        for: 2m
        labels:
          severity: critical
          component: ${appName}
          alert_type: error_budget_burn
          burn_rate: fast${customLabelsFormatted}
        annotations:
          summary: "${appName} is burning error budget rapidly"
          description: "Fast burn rate detected. At this rate, the entire ${errorBudgetWindow} error budget will be exhausted in ~2 days. Current error rate: {{ $value | humanizePercentage }}."

      # SLO: Error Budget Burn Rate (Slow Burn - 6h window)
      - alert: ${appName}ErrorBudgetSlowBurn
        expr: |
          (
            (${errorQuery6h})
            /
            (${totalQuery6h})
          ) > (${errorBudget / 100} * 6)
        for: 15m
        labels:
          severity: warning
          component: ${appName}
          alert_type: error_budget_burn
          burn_rate: slow${customLabelsFormatted}
        annotations:
          summary: "${appName} is burning error budget steadily"
          description: "Slow burn rate detected. At this rate, the entire ${errorBudgetWindow} error budget will be exhausted in ~5 days. Current error rate: {{ $value | humanizePercentage }}."

      # Error Budget Remaining (Recording Rule)
      - record: ${appName}:error_budget:remaining_ratio_${errorBudgetWindow}
        expr: |
          1 - (
            (
              sum(increase(http_requests_total{job="${appName}", namespace="${namespace}", code=~"5.."}[${errorBudgetWindow}]))
              /
              sum(increase(http_requests_total{job="${appName}", namespace="${namespace}"}[${errorBudgetWindow}]))
            ) / ${errorBudget / 100}
          )`;
    }

    // Generate Sloth SLO Spec (only if SLO is enabled)
    let slothYaml = '';
    if (sloEnabled) {
      const namespaceDescription = namespace ? ` in ${namespace}` : '';
      const namespaceAlertLabel = namespace ? `\n        namespace: "${namespace}"` : '';

      slothYaml = `version: "prometheus/v1"
service: "${appName}"
labels:
  owner: "platform-team"
  repo: "${appName}"
  tier: "1"
slos:
  - name: "${appName}-slo"
    objective: ${sloTarget}
    description: "SLO for ${appName}"
    sli:
      events:
        error_query: ${errorQueryWindow}
        total_query: ${totalQueryWindow}
    alerting:
      name: ${appName}SLOAlert
      labels:
        component: "${appName}"${namespaceAlertLabel}
      annotations:
        summary: "SLO breach for ${appName}"
        description: "Error budget is being consumed too fast for ${appName}${namespaceDescription}"
      page_alert:
        labels:
          severity: critical
          alert_type: page
      ticket_alert:
        labels:
          severity: warning
          alert_type: ticket`;
    }

    setGeneratedPrometheus(prometheusYaml);
    setGeneratedSloth(slothYaml);
  };

  const handleSlothUpload = async (file) => {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = yaml.load(text);

      // Extract values from Sloth spec
      if (parsed.service) {
        setAppName(parsed.service);
      }

      if (parsed.slos && parsed.slos.length > 0) {
        const firstSlo = parsed.slos[0];

        if (firstSlo.objective) {
          setSloTarget(firstSlo.objective);
        }

        // Try to extract namespace from queries
        const errorQuery = firstSlo.sli?.events?.error_query || '';
        const namespaceMatch = errorQuery.match(/namespace="([^"]+)"/);
        if (namespaceMatch) {
          setNamespace(namespaceMatch[1]);
        }

        // Try to extract job name
        const jobMatch = errorQuery.match(/job="([^"]+)"/);
        if (jobMatch && !parsed.service) {
          setAppName(jobMatch[1]);
        }
      }

      // Try to extract liveness query from alerting rules if present
      // Look for common patterns in the parsed YAML
      if (parsed.alerting?.liveness_query) {
        setLivenessQuery(parsed.alerting.liveness_query);
      }

      // Try to extract availability threshold if present
      if (parsed.alerting?.availability_threshold) {
        setLivenessAvailabilityThreshold(parsed.alerting.availability_threshold);
      }

      setUploadError('');
      // Auto-generate rules with loaded values
      setTimeout(generateRules, 100);

    } catch (error) {
      setUploadError(`Failed to parse Sloth YAML: ${error.message}`);
    }
  };

  const downloadFile = (content, filename) => {
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
    <MantineProvider theme={theme}>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        paddingTop: '2rem',
        paddingBottom: '4rem'
      }}>
        <Container size="lg">
          <Stack spacing="lg">
            <Paper 
              p="xl" 
              radius="lg"
              style={{
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Title 
                  order={1} 
                  mb="xs"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '2.5rem',
                    fontWeight: 700,
                  }}
                >
                  Prometheus Rule Generator
                </Title>
                <Text c="dimmed" size="lg">Generate Prometheus alerting rules and Sloth SLO specs for comprehensive monitoring</Text>
                <Text size="sm" c="dimmed" mt="xs" style={{ fontWeight: 500 }}>
                  Brought to you by <a href="https://cardinality.cloud/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>Cardinality Cloud, LLC</a>.
                </Text>
              </div>
            </Paper>

          {/* Top Banner Ad Placement */}
          <Paper 
            p="md" 
            radius="lg"
            withBorder 
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              textAlign: 'center',
              minHeight: '90px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: '#e0e0e0',
            }}
          >
            <div id="carbon-ads-top" style={{ width: '100%' }}>
              {/* Carbon Ads or other ad network code goes here */}
              <Text size="xs" c="dimmed">Advertisement</Text>
            </div>
          </Paper>

          <Paper shadow="md" p="xl" withBorder radius="lg" style={{ background: 'white' }}>
            <Stack spacing="xl">
              <Group position="apart" align="flex-start">
                <div>
                  <Title order={2} mb="xs" style={{ fontSize: '1.75rem' }}>Configuration</Title>
                  <Text size="sm" c="dimmed">Configure your application monitoring and SLO parameters</Text>
                </div>
                <FileButton onChange={handleSlothUpload} accept=".yaml,.yml">
                  {(props) => <Button {...props} variant="light" size="md" leftSection={<IconUpload size={18} />}>Upload Sloth Spec</Button>}
                </FileButton>
              </Group>

              {uploadError && (
                <Alert color="red" title="Upload Error">
                  {uploadError}
                </Alert>
              )}

              {/* Basic Configuration */}
              <Paper p="lg" withBorder radius="md" style={{ backgroundColor: '#f8f9fa' }}>
                <Stack spacing="md">
                  <Group spacing="xs">
                    <IconClipboardList size={22} style={{ color: '#339af0' }} />
                    <Title order={4} style={{ fontSize: '1.1rem' }}>Basic Information</Title>
                    <Badge color="red" variant="filled" size="sm">Required</Badge>
                  </Group>

                  <TextInput
                    label="Application Name / Job Name"
                    description="Used as the job label in queries and as the base name for all generated rules and alerts"
                    placeholder="my-api"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    required
                    size="md"
                    styles={{
                      label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }
                    }}
                  />

                  <TextInput
                    label="Namespace (Optional)"
                    description="Kubernetes namespace or environment identifier (e.g., 'production', 'staging'). Used as a label filter in queries. Leave empty if not using namespaces."
                    placeholder="production"
                    value={namespace}
                    onChange={(e) => setNamespace(e.target.value)}
                    size="md"
                    styles={{
                      label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }
                    }}
                  />
                </Stack>
              </Paper>

              {/* Accordion for Advanced Settings */}
              <Accordion
                variant="separated"
                defaultValue={["liveness", "slo", "alerts"]}
                multiple
                styles={{
                  item: {
                    border: '1px solid #e9ecef',
                    marginBottom: '0.75rem',
                  },
                  control: {
                    padding: '1rem 1.25rem',
                    '&:hover': {
                      backgroundColor: '#f8f9fa',
                    },
                  },
                  label: {
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  },
                  content: {
                    padding: '1.25rem',
                  },
                }}
              >
                <Accordion.Item value="liveness">
                  <Accordion.Control icon={<IconHeartbeat size={20} />}>Liveness / Availability Settings</Accordion.Control>
                  <Accordion.Panel>
                    <Stack spacing="lg">
                      <Textarea
                        label="Liveness PromQL Query"
                        description="PromQL expression that returns 1 (up) or 0 (down) for each instance. Defaults to up{job='...'} using the Application Name above if left empty."
                        placeholder={namespace ? `up{job="${appName || 'my-app'}", namespace="${namespace}"}` : `up{job="${appName || 'my-app'}"}`}
                        value={livenessQuery}
                        onChange={(e) => setLivenessQuery(e.target.value)}
                        minRows={3}
                        autosize
                        size="md"
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 },
                          input: { fontFamily: 'Monaco, Consolas, monospace', fontSize: '0.9rem' }
                        }}
                      />

                      <Paper p="md" withBorder style={{ backgroundColor: '#f1f3f5' }}>
                        <Stack spacing="sm">
                          <Text size="sm" fw={600}>
                            Minimum Availability Threshold: {livenessAvailabilityThreshold}%
                          </Text>
                          <Text size="xs" c="dimmed">
                            Alert when less than this percentage of instances are up (based on avg of liveness query)
                          </Text>
                          <Slider
                            value={livenessAvailabilityThreshold}
                            onChange={setLivenessAvailabilityThreshold}
                            min={0}
                            max={100}
                            step={5}
                            marks={[
                              { value: 0, label: '0%' },
                              { value: 50, label: '50%' },
                              { value: 80, label: '80%' },
                              { value: 100, label: '100%' },
                            ]}
                            size="md"
                            mt="md"
                          />
                        </Stack>
                      </Paper>

                      <NumberInput
                        label="Liveness Alert Duration (minutes)"
                        description="How long availability must be below threshold before alerting"
                        value={livenessThreshold}
                        onChange={setLivenessThreshold}
                        min={1}
                        max={60}
                        size="md"
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }
                        }}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="slo">
                  <Accordion.Control icon={<IconTarget size={20} />}>SLO Settings (Optional)</Accordion.Control>
                  <Accordion.Panel>
                    <Stack spacing="md">
                      <Switch
                        label="Generate SLO-based alerts and Sloth spec"
                        description="Enable to generate error budget burn rate alerts and Sloth specifications"
                        checked={sloEnabled}
                        onChange={(e) => setSloEnabled(e.currentTarget.checked)}
                        size="md"
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600 }
                        }}
                      />

                      <Textarea
                        label="Error Query"
                        description="PromQL query for 'bad' events. Use {{.window}} as placeholder for time window (Sloth format). Uses Application Name as job label. Defaults to HTTP 5xx errors if left empty."
                        placeholder={namespace ? `sum(rate(http_requests_total{job="${appName || 'my-app'}",namespace="${namespace}",code=~"5.."}[{{.window}}]))` : `sum(rate(http_requests_total{job="${appName || 'my-app'}",code=~"5.."}[{{.window}}]))`}
                        value={errorQuery}
                        onChange={(e) => setErrorQuery(e.target.value)}
                        minRows={3}
                        autosize
                        size="md"
                        disabled={!sloEnabled}
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 },
                          input: { fontFamily: 'Monaco, Consolas, monospace', fontSize: '0.9rem' }
                        }}
                      />

                      <Textarea
                        label="Total Query"
                        description="PromQL query for total events. Use {{.window}} as placeholder for time window (Sloth format). Uses Application Name as job label. Defaults to all HTTP requests if left empty."
                        placeholder={namespace ? `sum(rate(http_requests_total{job="${appName || 'my-app'}",namespace="${namespace}"}[{{.window}}]))` : `sum(rate(http_requests_total{job="${appName || 'my-app'}"}[{{.window}}]))`}
                        value={totalQuery}
                        onChange={(e) => setTotalQuery(e.target.value)}
                        minRows={3}
                        autosize
                        size="md"
                        disabled={!sloEnabled}
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 },
                          input: { fontFamily: 'Monaco, Consolas, monospace', fontSize: '0.9rem' }
                        }}
                      />

                      <Select
                        label="SLO Target"
                        description="Target availability/reliability percentage based on industry-standard SLO tiers"
                        value={sloTarget.toString()}
                        onChange={(value) => setSloTarget(parseFloat(value))}
                        data={[
                          { value: '95', label: '95% (one nine)' },
                          { value: '99', label: '99% (two nines)' },
                          { value: '99.9', label: '99.9% (three nines)' },
                          { value: '99.99', label: '99.99% (four nines)' },
                          { value: '99.999', label: '99.999% (five nines)' },
                        ]}
                        size="md"
                        disabled={!sloEnabled}
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }
                        }}
                      />

                      {sloEnabled && (() => {
                        const downtime = calculateDowntime(sloTarget);
                        return (
                          <Paper p="md" withBorder style={{ backgroundColor: '#e7f5ff', borderColor: '#339af0' }}>
                            <Group spacing="md" position="apart">
                              <div>
                                <Text size="xs" fw={600} c="dimmed" mb={4}>ALLOWED DOWNTIME</Text>
                                <Group spacing="xl">
                                  <div>
                                    <Text size="sm" c="dimmed" style={{ fontSize: '0.75rem' }}>Per Month</Text>
                                    <Text size="lg" fw={700} c="#1971c2">{downtime.perMonth}</Text>
                                  </div>
                                  <div>
                                    <Text size="sm" c="dimmed" style={{ fontSize: '0.75rem' }}>Per Year</Text>
                                    <Text size="lg" fw={700} c="#1971c2">{downtime.perYear}</Text>
                                  </div>
                                </Group>
                              </div>
                              <Text size="xs" c="dimmed" style={{ maxWidth: '200px' }}>
                                Maximum acceptable downtime for {sloTarget}% SLO target
                              </Text>
                            </Group>
                          </Paper>
                        );
                      })()}

                      <Select
                        label="Error Budget Window"
                        description="Time window for error budget calculations"
                        value={errorBudgetWindow}
                        onChange={setErrorBudgetWindow}
                        data={[
                          { value: '7d', label: '7 days' },
                          { value: '30d', label: '30 days' },
                          { value: '90d', label: '90 days' },
                        ]}
                        size="md"
                        disabled={!sloEnabled}
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }
                        }}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="alerts">
                  <Accordion.Control icon={<IconBell size={20} />}>Alert Settings</Accordion.Control>
                  <Accordion.Panel>
                    <Stack spacing="md">
                      <Select
                        label="Evaluation Interval"
                        description="How often Prometheus evaluates these rules"
                        value={evaluationInterval}
                        onChange={setEvaluationInterval}
                        data={[
                          { value: '30s', label: '30 seconds' },
                          { value: '1m', label: '1 minute' },
                          { value: '2m', label: '2 minutes' },
                          { value: '5m', label: '5 minutes' },
                        ]}
                        size="md"
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }
                        }}
                      />

                      <Textarea
                        label="Additional Alert Labels (Optional)"
                        description="Custom labels to add to all alerts. Perfect for routing labels (team, squad), documentation links (runbook_url), or any metadata needed for alert management. Format: one per line as key: value"
                        placeholder="team: sre&#10;priority: high&#10;runbook_url: https://wiki.example.com/runbooks"
                        value={customAlertLabels}
                        onChange={(e) => setCustomAlertLabels(e.target.value)}
                        minRows={3}
                        autosize
                        size="md"
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 },
                          input: { fontFamily: 'Monaco, Consolas, monospace', fontSize: '0.9rem' }
                        }}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>

              <Button
                onClick={generateRules}
                size="lg"
                disabled={!appName}
                fullWidth
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Generate Rules
              </Button>
            </Stack>
          </Paper>

          {/* Mid-Page Ad Placement - Shows after form submission */}
          {generatedPrometheus && (
            <Paper 
              p="md" 
              radius="lg"
              withBorder 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                textAlign: 'center',
                minHeight: '90px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: '#e0e0e0',
              }}
            >
              <div id="carbon-ads-mid" style={{ width: '100%' }}>
                {/* Carbon Ads or other ad network code goes here */}
                <Text size="xs" c="dimmed">Advertisement</Text>
              </div>
            </Paper>
          )}

          {generatedPrometheus && (
            <Paper shadow="md" p="xl" withBorder radius="lg" style={{ background: 'white' }}>
              <Tabs defaultValue="prometheus">
                <Tabs.List>
                  <Tabs.Tab value="prometheus">Prometheus Rules</Tabs.Tab>
                  {sloEnabled && <Tabs.Tab value="sloth">Sloth SLO Spec</Tabs.Tab>}
                </Tabs.List>

                <Tabs.Panel value="prometheus" pt="md">
                  <Stack spacing="md">
                    <Group position="apart">
                      <Title order={3}>Prometheus Rules</Title>
                      <Group>
                        <Button
                          variant="light"
                          leftSection={<IconCopy size={18} />}
                          onClick={() => navigator.clipboard.writeText(generatedPrometheus)}
                        >
                          Copy
                        </Button>
                        <Button
                          leftSection={<IconDownload size={18} />}
                          onClick={() => downloadFile(generatedPrometheus, `${appName}-prometheus-rules.yaml`)}
                        >
                          Download
                        </Button>
                      </Group>
                    </Group>
                    
                    <Code block style={{ 
                      whiteSpace: 'pre', 
                      overflow: 'auto', 
                      maxHeight: '600px',
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                    }}>
                      {generatedPrometheus}
                    </Code>

                    <Text size="sm" c="dimmed">
                      <strong>Usage:</strong> Add this to your Prometheus configuration in the <code>rules</code> directory.
                      These rules include liveness checks, SLO breach detection, and multi-window burn rate alerts.
                    </Text>
                  </Stack>
                </Tabs.Panel>

                {sloEnabled && (
                  <Tabs.Panel value="sloth" pt="md">
                  <Stack spacing="md">
                    <Group position="apart">
                      <Title order={3}>Sloth SLO Spec</Title>
                      <Group>
                        <Button
                          variant="light"
                          leftSection={<IconCopy size={18} />}
                          onClick={() => navigator.clipboard.writeText(generatedSloth)}
                        >
                          Copy
                        </Button>
                        <Button
                          leftSection={<IconDownload size={18} />}
                          onClick={() => downloadFile(generatedSloth, `${appName}-sloth-slo.yaml`)}
                        >
                          Download
                        </Button>
                      </Group>
                    </Group>
                    
                    <Code block style={{ 
                      whiteSpace: 'pre', 
                      overflow: 'auto', 
                      maxHeight: '600px',
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                    }}>
                      {generatedSloth}
                    </Code>

                    <Alert color="blue" title="Using the Sloth CLI">
                      <Text size="sm">
                        Process this spec with the Sloth CLI to generate comprehensive multi-window, multi-burn-rate alerts:
                      </Text>
                      <Code block mt="xs">
                        sloth generate -i {appName}-sloth-slo.yaml -o {appName}-sloth-rules.yaml
                      </Code>
                    </Alert>
                  </Stack>
                </Tabs.Panel>
                )}
              </Tabs>

              <Divider my="md" />

              <Text size="sm" c="dimmed">
                <strong>Required Metrics:</strong>
                <ul style={{ marginTop: '8px', marginBottom: '0' }}>
                  <li><code>{livenessQuery || `up{job="${appName}", namespace="${namespace}"}`}</code> - Liveness checks</li>
                  {sloEnabled && (
                    <>
                      <li><code>http_requests_total</code> - Request counter with <code>code</code> label</li>
                      <li><code>http_request_duration_seconds_bucket</code> - Latency histogram</li>
                    </>
                  )}
                </ul>
              </Text>
            </Paper>
          )}

          {/* Bottom Ad Placement - Shows after output */}
          {generatedPrometheus && (
            <Paper 
              p="md" 
              radius="lg"
              withBorder 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                textAlign: 'center',
                minHeight: '90px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: '#e0e0e0',
              }}
            >
              <div id="carbon-ads-bottom" style={{ width: '100%' }}>
                {/* Carbon Ads or other ad network code goes here */}
                <Text size="xs" c="dimmed">Advertisement</Text>
              </div>
            </Paper>
          )}

          {/* Footer */}
          <Paper
            p="xl"
            radius="lg"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              textAlign: 'center',
              marginTop: '3rem',
            }}
          >
            <Divider mb="md" />
            <Group position="center" spacing="xl">
              <Text size="sm" c="dimmed">
                Built by <a
                  href="https://cardinality.cloud/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#667eea',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  Cardinality Cloud, LLC
                </a>
              </Text>
              <Text size="sm" c="dimmed">•</Text>
              <Text size="sm">
                <a
                  href="mailto:jjneely@cardinality.cloud?subject=Prometheus Rule Generator Feedback"
                  style={{
                    color: '#667eea',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  Give Feedback
                </a>
              </Text>
            </Group>
          </Paper>
        </Stack>
      </Container>
      </div>
    </MantineProvider>
  );
}