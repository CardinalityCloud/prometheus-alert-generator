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
  const [sliMetric, setSliMetric] = useState('availability');
  const [generatedPrometheus, setGeneratedPrometheus] = useState('');
  const [generatedSloth, setGeneratedSloth] = useState('');
  const [uploadError, setUploadError] = useState('');

  const generateRules = () => {
    const errorBudget = 100 - sloTarget;
    const effectiveLivenessQuery = livenessQuery || `up{job="${appName}", namespace="${namespace}"}`;
    const availabilityThresholdDecimal = livenessAvailabilityThreshold / 100;

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
          alert_type: liveness
        annotations:
          summary: "${appName} availability below ${livenessAvailabilityThreshold}% in ${namespace}"
          description: "Less than ${livenessAvailabilityThreshold}% of ${appName} instances are up. Current availability: {{ $value | humanizePercentage }}"`;

    // Add SLO rules only if enabled
    if (sloEnabled) {
      prometheusYaml += `

      # SLO: Availability
      - record: ${appName}:availability:ratio_rate5m
        expr: |
          sum(rate(http_requests_total{job="${appName}", namespace="${namespace}", code!~"5.."}[5m]))
          /
          sum(rate(http_requests_total{job="${appName}", namespace="${namespace}"}[5m]))

      - alert: ${appName}AvailabilitySLOBreach
        expr: |
          (
            1 - ${appName}:availability:ratio_rate5m
          ) * 100 > ${errorBudget}
        for: 5m
        labels:
          severity: warning
          component: ${appName}
          alert_type: slo_breach
        annotations:
          summary: "${appName} availability SLO breach"
          description: "Error rate for ${appName} is {{ $value | humanizePercentage }}, exceeding the error budget of ${errorBudget}% (SLO target: ${sloTarget}%)."

      # SLO: Error Budget Burn Rate (Fast Burn - 1h window)
      - alert: ${appName}ErrorBudgetFastBurn
        expr: |
          (
            1 - (
              sum(rate(http_requests_total{job="${appName}", namespace="${namespace}", code!~"5.."}[1h]))
              /
              sum(rate(http_requests_total{job="${appName}", namespace="${namespace}"}[1h]))
            )
          ) > (${errorBudget / 100} * 14.4)
        for: 2m
        labels:
          severity: critical
          component: ${appName}
          alert_type: error_budget_burn
          burn_rate: fast
        annotations:
          summary: "${appName} is burning error budget rapidly"
          description: "Fast burn rate detected. At this rate, the entire ${errorBudgetWindow} error budget will be exhausted in ~2 days. Current error rate: {{ $value | humanizePercentage }}."

      # SLO: Error Budget Burn Rate (Slow Burn - 6h window)
      - alert: ${appName}ErrorBudgetSlowBurn
        expr: |
          (
            1 - (
              sum(rate(http_requests_total{job="${appName}", namespace="${namespace}", code!~"5.."}[6h]))
              /
              sum(rate(http_requests_total{job="${appName}", namespace="${namespace}"}[6h]))
            )
          ) > (${errorBudget / 100} * 6)
        for: 15m
        labels:
          severity: warning
          component: ${appName}
          alert_type: error_budget_burn
          burn_rate: slow
        annotations:
          summary: "${appName} is burning error budget steadily"
          description: "Slow burn rate detected. At this rate, the entire ${errorBudgetWindow} error budget will be exhausted in ~5 days. Current error rate: {{ $value | humanizePercentage }}."

      # SLO: Latency P99
      - record: ${appName}:latency:p99_5m
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket{job="${appName}", namespace="${namespace}"}[5m])) by (le)
          )

      - alert: ${appName}HighLatency
        expr: ${appName}:latency:p99_5m > 1
        for: 10m
        labels:
          severity: warning
          component: ${appName}
          alert_type: latency
        annotations:
          summary: "${appName} high latency detected"
          description: "P99 latency for ${appName} is {{ $value | humanizeDuration }}, exceeding 1 second threshold."

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
      slothYaml = `version: "prometheus/v1"
service: "${appName}"
labels:
  owner: "platform-team"
  repo: "${appName}"
  tier: "1"
slos:
  - name: "${appName}-availability"
    objective: ${sloTarget}
    description: "Availability SLO for ${appName} based on HTTP request success rate"
    sli:
      events:
        error_query: sum(rate(http_requests_total{job="${appName}",namespace="${namespace}",code=~"5.."}[{{.window}}]))
        total_query: sum(rate(http_requests_total{job="${appName}",namespace="${namespace}"}[{{.window}}]))
    alerting:
      name: ${appName}AvailabilityAlert
      labels:
        component: "${appName}"
        namespace: "${namespace}"
      annotations:
        summary: "High error rate on ${appName}"
        description: "Error budget is being consumed too fast for ${appName} in ${namespace}"
      page_alert:
        labels:
          severity: critical
          alert_type: page
      ticket_alert:
        labels:
          severity: warning
          alert_type: ticket
  
  - name: "${appName}-latency"
    objective: ${sloTarget}
    description: "Latency SLO for ${appName} - P99 latency under 1 second"
    sli:
      events:
        error_query: |
          sum(rate(http_request_duration_seconds_bucket{job="${appName}",namespace="${namespace}",le="1"}[{{.window}}]))
        total_query: sum(rate(http_request_duration_seconds_count{job="${appName}",namespace="${namespace}"}[{{.window}}]))
    alerting:
      name: ${appName}LatencyAlert
      labels:
        component: "${appName}"
        namespace: "${namespace}"
      annotations:
        summary: "High latency on ${appName}"
        description: "Too many requests are exceeding 1s latency threshold for ${appName}"
      page_alert:
        labels:
          severity: warning
          alert_type: page
      ticket_alert:
        labels:
          severity: info
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
                    label="Application Name"
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
                    label="Namespace"
                    placeholder="production"
                    value={namespace}
                    onChange={(e) => setNamespace(e.target.value)}
                    required
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
                        description="PromQL expression that returns 1 (up) or 0 (down) for each instance. Example: up{job='my-app', namespace='production'}"
                        placeholder={`up{job="${appName || 'my-app'}", namespace="${namespace || 'production'}"}`}
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
                        description="Enable to generate error budget burn rate alerts, latency SLOs, and Sloth specifications"
                        checked={sloEnabled}
                        onChange={(e) => setSloEnabled(e.currentTarget.checked)}
                        size="md"
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600 }
                        }}
                      />

                      <NumberInput
                        label="SLO Target (%)"
                        description="Target availability percentage (e.g., 99.9% = 'three nines')"
                        value={sloTarget}
                        onChange={setSloTarget}
                        min={90}
                        max={100}
                        step={0.1}
                        precision={2}
                        size="md"
                        disabled={!sloEnabled}
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }
                        }}
                      />

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
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>

              <Button 
                onClick={generateRules} 
                size="lg"
                disabled={!appName || !namespace}
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
        </Stack>
      </Container>
      </div>
    </MantineProvider>
  );
}