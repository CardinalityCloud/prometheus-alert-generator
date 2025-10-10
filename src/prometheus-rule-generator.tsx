import { useState } from 'react';
import { MantineProvider, Container, Title, TextInput, Textarea, NumberInput, Select, Slider, Switch, Button, Paper, Code, Stack, Group, Text, Divider, Tabs, FileButton, Alert, Accordion, Badge, createTheme } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconClipboardList, IconUpload, IconTarget, IconHeartbeat, IconBell, IconCopy, IconDownload, IconBrandGithub, IconBug, IconMail, IconExternalLink, IconQuestionMark, IconNews } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import * as yaml from 'js-yaml';

const enableAds = false;

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
  const [generatedPrometheus, setGeneratedPrometheus] = useState('');
  const [generatedConfig, setGeneratedConfig] = useState('');
  const [uploadError, setUploadError] = useState('');

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

  // Form with validation
  const form = useForm({
    initialValues: {
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
    },
    validate: {
      appName: (value: string) => (!value.trim() ? 'Application name is required' : null),
      sloType: (value: string) => (!value.trim() ? 'SLO type is required' : null),
      livenessQuery: validatePromQLMetric,
      errorQuery: validatePromQLMetric,
      totalQuery: validatePromQLMetric,
    },
  });

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
    if (!form.isValid()) {
      form.validate();
      return;
    }

    const { appName, sloEnabled, sloTarget, evaluationInterval, livenessThreshold, livenessQuery,
            livenessAvailabilityThreshold, errorBudgetWindow, errorQuery, totalQuery, customAlertLabels, customAlertAnnotations } = form.values;

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
      const sloTargetDecimal = sloTarget / 100;

      prometheusYaml += `
      # ========================================
      # Recording Rules - SLO Metrics
      # ========================================

      # SLO Goal (constant)
      - record: job:slo_goal:ratio
        expr: ${sloTargetDecimal}
        labels:
          job: ${appName}
          slo_type: ${form.values.sloType}

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
          slo_type: ${form.values.sloType}

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
          slo_type: ${form.values.sloType}

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
          slo_type: ${form.values.sloType}

      # Error ratio over 5m window (for error budget tracking)
      - record: job:slo_burn:ratio_5m
        expr: |
          (${errorQuery5m})
          /
          (${totalQuery5m})
        labels:
          job: ${appName}
          slo_type: ${form.values.sloType}

      # Error ratio over 1h window (for fast burn rate)
      - record: job:slo_burn:ratio_1h
        expr: |
          (${errorQuery1h})
          /
          (${totalQuery1h})
        labels:
          job: ${appName}
          slo_type: ${form.values.sloType}

      # Error ratio over 6h window (for slow burn rate)
      - record: job:slo_burn:ratio_6h
        expr: |
          (${errorQuery6h})
          /
          (${totalQuery6h})
        labels:
          job: ${appName}
          slo_type: ${form.values.sloType}

      # Error budget remaining (uses 5m error rate samples over the budget window)
      - record: job:error_budget:remaining_ratio_${errorBudgetWindow}
        expr: |
          1 - (
            avg_over_time(job:slo_burn:ratio_5m{job="${appName}",slo_type="${form.values.sloType}"}[${errorBudgetWindow}])
            /
            (1 - job:slo_goal:ratio{job="${appName}",slo_type="${form.values.sloType}"})
          )
        labels:
          job: ${appName}
          slo_type: ${form.values.sloType}
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
          job:error_budget:remaining_ratio_${errorBudgetWindow}{job="${appName}",slo_type="${form.values.sloType}"} < 0
        for: 5m
        labels:
          severity: warning
          component: ${appName}
          alert_type: slo_breach
          slo_type: ${form.values.sloType}${customLabelsFormatted}
        annotations:
          summary: "${appName} ${form.values.sloType} SLO breach - error budget exhausted"
          description: "The ${appName} ${form.values.sloType} SLO has been violated. Error budget for the ${errorBudgetWindow} window has been completely exhausted. The ${sloTarget}% availability target has not been met. Remaining budget: {{ $value | humanizePercentage }}."${customAnnotationsFormatted}

      # Error Budget Fast Burn Alert
      - alert: ${appName}ErrorBudgetFastBurn
        expr: |
          job:slo_burn:ratio_1h{job="${appName}",slo_type="${form.values.sloType}"} > ((1 - job:slo_goal:ratio{job="${appName}",slo_type="${form.values.sloType}"}) * 14.4)
        for: 2m
        labels:
          severity: critical
          component: ${appName}
          alert_type: error_budget_burn
          slo_type: ${form.values.sloType}
          burn_rate: fast${customLabelsFormatted}
        annotations:
          summary: "${appName} ${form.values.sloType} SLO is burning error budget rapidly"
          description: "Fast burn rate detected for ${form.values.sloType} SLO. At this rate, the entire ${errorBudgetWindow} error budget will be exhausted in ~2 days. Current error rate: {{ $value | humanizePercentage }}."${customAnnotationsFormatted}

      # Error Budget Slow Burn Alert
      - alert: ${appName}ErrorBudgetSlowBurn
        expr: |
          job:slo_burn:ratio_6h{job="${appName}",slo_type="${form.values.sloType}"} > ((1 - job:slo_goal:ratio{job="${appName}",slo_type="${form.values.sloType}"}) * 6)
        for: 15m
        labels:
          severity: warning
          component: ${appName}
          alert_type: error_budget_burn
          slo_type: ${form.values.sloType}
          burn_rate: slow${customLabelsFormatted}
        annotations:
          summary: "${appName} ${form.values.sloType} SLO is burning error budget steadily"
          description: "Slow burn rate detected for ${form.values.sloType} SLO. At this rate, the entire ${errorBudgetWindow} error budget will be exhausted in ~5 days. Current error rate: {{ $value | humanizePercentage }}."${customAnnotationsFormatted}`;
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
    type: "${form.values.sloType}"
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

  const handleConfigUpload = async (file: File | null) => {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = yaml.load(text);

      // Extract values from config spec and update form
      const config = parsed as any;
      const firstSlo = config.slos?.[0];

      form.setValues({
        appName: config.application?.name || form.values.appName,
        livenessQuery: config.liveness?.query || form.values.livenessQuery,
        livenessAvailabilityThreshold: config.liveness?.availability_threshold ?? form.values.livenessAvailabilityThreshold,
        livenessThreshold: config.liveness?.alert_duration_minutes ?? form.values.livenessThreshold,
        sloEnabled: (config.slos && config.slos.length > 0 && firstSlo?.enabled) ?? form.values.sloEnabled,
        sloType: firstSlo?.type || form.values.sloType,
        sloTarget: firstSlo?.target ?? form.values.sloTarget,
        errorQuery: firstSlo?.error_metric || form.values.errorQuery,
        totalQuery: firstSlo?.total_metric || form.values.totalQuery,
        errorBudgetWindow: firstSlo?.error_budget_window || form.values.errorBudgetWindow,
        evaluationInterval: config.alerts?.evaluation_interval || form.values.evaluationInterval,
        customAlertLabels: config.alerts?.custom_labels?.trim() || form.values.customAlertLabels,
        customAlertAnnotations: config.alerts?.custom_annotations?.trim() || form.values.customAlertAnnotations,
      });

      setUploadError('');
      // Auto-generate rules with loaded values
      setTimeout(generateRules, 100);

    } catch (error: any) {
      setUploadError(`Failed to parse configuration YAML: ${error.message}`);
    }
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
    <MantineProvider theme={theme}>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        paddingTop: '2rem',
        paddingBottom: '4rem'
      }}>
        <Container size="lg">
          <Stack gap="lg">
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
                  Free Prometheus Alert Rule Generator
                </Title>
                <Text c="dimmed" size="lg">Generate Prometheus alerting rules and SLOs for comprehensive monitoring.</Text>
                <Group justify="center" mt="md" mb="xs">
                  <Button component={Link} to="/faq" variant="light" leftSection={<IconQuestionMark size={18} />}>
                    FAQ
                  </Button>
                </Group>
                <Text size="sm" c="dimmed" style={{ fontWeight: 500 }}>
                  Brought to you by <a href="https://cardinality.cloud/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>Cardinality Cloud, LLC</a>.
                </Text>
              </div>
            </Paper>

          {/* Top Banner Ad Placement */}
          {enableAds && (<Paper
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
          </Paper>)}

          <Paper shadow="md" p="xl" withBorder radius="lg" style={{ background: 'white' }}>
            <Stack gap="xl">
              <Group justify="apart" align="flex-start">
                <div>
                  <Title order={2} mb="xs" style={{ fontSize: '1.75rem' }}>Configuration</Title>
                  <Text size="sm" c="dimmed">Configure your application monitoring and SLO parameters</Text>
                </div>
                <FileButton onChange={handleConfigUpload} accept=".yaml,.yml">
                  {(props) => <Button {...props} variant="light" size="md" leftSection={<IconUpload size={18} />}>Upload Config</Button>}
                </FileButton>
              </Group>

              {uploadError && (
                <Alert color="red" title="Upload Error">
                  {uploadError}
                </Alert>
              )}

              {/* Basic Configuration */}
              <Paper p="lg" withBorder radius="md" style={{ backgroundColor: '#f8f9fa' }}>
                <Stack gap="md">
                  <Group gap="xs">
                    <IconClipboardList size={22} style={{ color: '#339af0' }} />
                    <Title order={4} style={{ fontSize: '1.1rem' }}>Basic Information</Title>
                    <Badge color="red" variant="filled" size="sm">Required</Badge>
                  </Group>

                  <TextInput
                    label="Application Name / Job Name"
                    description="Used as the job label in queries and as the base name for all generated rules and alerts"
                    placeholder="my-api"
                    required
                    size="md"
                    styles={{
                      label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }
                    }}
                    {...form.getInputProps('appName')}
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
                    <Stack gap="lg">
                      <Textarea
                        label="Liveness PromQL Query"
                        description="PromQL expression that returns 1 (up) or 0 (down) for each instance. Defaults to up{job='...'} using the Application Name above if left empty."
                        placeholder={`up{job="${form.values.appName || 'my-app'}"}`}
                        minRows={3}
                        autosize
                        size="md"
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 },
                          input: { fontFamily: 'Monaco, Consolas, monospace', fontSize: '0.9rem' }
                        }}
                        {...form.getInputProps('livenessQuery')}
                      />

                      <Paper p="md" withBorder style={{ backgroundColor: '#f1f3f5' }}>
                        <Stack gap="sm">
                          <Text size="sm" fw={600}>
                            Minimum Availability Threshold: {form.values.livenessAvailabilityThreshold}%
                          </Text>
                          <Text size="xs" c="dimmed">
                            Alert when less than this percentage of instances are up (based on avg of liveness query)
                          </Text>
                          <Slider
                            {...form.getInputProps('livenessAvailabilityThreshold')}
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
                            mb="lg"
                          />
                        </Stack>
                      </Paper>

                      <NumberInput
                        label="Liveness Alert Duration (minutes)"
                        description="How long availability must be below threshold before alerting"
                        min={1}
                        max={60}
                        size="md"
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }
                        }}
                        {...form.getInputProps('livenessThreshold')}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="slo">
                  <Accordion.Control icon={<IconTarget size={20} />}>SLO Settings (Optional)</Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="md">
                      <Switch
                        label="Generate SLO-based alerts"
                        description="Enable to generate error budget burn rate alerts"
                        size="md"
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600 }
                        }}
                        {...form.getInputProps('sloEnabled', { type: 'checkbox' })}
                      />

                      <TextInput
                        label="SLO Type"
                        description="Type of SLO for labeling (e.g., 'availability', 'latency', 'correctness'). Used to differentiate multiple SLOs for the same service."
                        placeholder="availability"
                        size="md"
                        disabled={!form.values.sloEnabled}
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 },
                        }}
                        {...form.getInputProps('sloType')}
                      />

                      <Textarea
                        label="Error Metric (Counter)"
                        description="Raw Prometheus Counter metric for 'bad' events. Just provide the metric name and labels - we'll automatically wrap it with sum(rate()). Defaults to HTTP 5xx errors if left empty."
                        placeholder={`http_requests_total{job="${form.values.appName || 'my-app'}",code=~"5.."}`}
                        minRows={2}
                        autosize
                        size="md"
                        disabled={!form.values.sloEnabled}
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 },
                          input: { fontFamily: 'Monaco, Consolas, monospace', fontSize: '0.9rem' }
                        }}
                        {...form.getInputProps('errorQuery')}
                      />

                      <Textarea
                        label="Total Metric (Counter)"
                        description="Raw Prometheus Counter metric for total events. Just provide the metric name and labels - we'll automatically wrap it with sum(rate()). Defaults to all HTTP requests if left empty."
                        placeholder={`http_requests_total{job="${form.values.appName || 'my-app'}"}`}
                        minRows={2}
                        autosize
                        size="md"
                        disabled={!form.values.sloEnabled}
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 },
                          input: { fontFamily: 'Monaco, Consolas, monospace', fontSize: '0.9rem' }
                        }}
                        {...form.getInputProps('totalQuery')}
                      />

                      <Select
                        label="SLO Target"
                        description="Target availability/reliability percentage based on industry-standard SLO tiers"
                        data={[
                          { value: '95', label: '95% (one nine)' },
                          { value: '99', label: '99% (two nines)' },
                          { value: '99.9', label: '99.9% (three nines)' },
                          { value: '99.99', label: '99.99% (four nines)' },
                          { value: '99.999', label: '99.999% (five nines)' },
                        ]}
                        size="md"
                        disabled={!form.values.sloEnabled}
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }
                        }}
                        value={form.values.sloTarget.toString()}
                        onChange={(value) => form.setFieldValue('sloTarget', parseFloat(value || '99.9'))}
                      />

                      {form.values.sloEnabled && (() => {
                        const downtime = calculateDowntime(form.values.sloTarget);
                        return (
                          <Paper p="md" withBorder style={{ backgroundColor: '#e7f5ff', borderColor: '#339af0' }}>
                            <Group gap="md" justify="apart">
                              <div>
                                <Text size="xs" fw={600} c="dimmed" mb={4}>ALLOWED DOWNTIME</Text>
                                <Group gap="xl">
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
                                Maximum acceptable downtime for {form.values.sloTarget}% SLO target
                              </Text>
                            </Group>
                          </Paper>
                        );
                      })()}

                      <Select
                        label="Error Budget Window"
                        description="Time window for error budget calculations"
                        data={[
                          { value: '7d', label: '7 days' },
                          { value: '30d', label: '30 days' },
                          { value: '90d', label: '90 days' },
                        ]}
                        size="md"
                        disabled={!form.values.sloEnabled}
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }
                        }}
                        {...form.getInputProps('errorBudgetWindow')}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="alerts">
                  <Accordion.Control icon={<IconBell size={20} />}>Alert Settings</Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="md">
                      <Select
                        label="Evaluation Interval"
                        description="How often Prometheus evaluates these rules"
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
                        {...form.getInputProps('evaluationInterval')}
                      />

                      <Textarea
                        label="Additional Alert Labels (Optional)"
                        description="Custom labels to add to all alerts. Perfect for routing labels (team, squad), or any metadata needed for alert management. Format: one per line as key: value"
                        placeholder="team: sre&#10;squad: platform&#10;priority: high"
                        minRows={3}
                        autosize
                        size="md"
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 },
                          input: { fontFamily: 'Monaco, Consolas, monospace', fontSize: '0.9rem' }
                        }}
                        {...form.getInputProps('customAlertLabels')}
                      />

                      <Textarea
                        label="Additional Alert Annotations (Optional)"
                        description="Custom annotations to add to all alerts. Perfect for documentation links (runbook_url, dashboard), or contextual information. Format: one per line as key: value"
                        placeholder="runbook_url: https://wiki.example.com/runbooks&#10;dashboard: https://grafana.example.com/d/app-overview"
                        minRows={3}
                        autosize
                        size="md"
                        styles={{
                          label: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 },
                          input: { fontFamily: 'Monaco, Consolas, monospace', fontSize: '0.9rem' }
                        }}
                        {...form.getInputProps('customAlertAnnotations')}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>

              <Button
                onClick={generateRules}
                size="lg"
                disabled={!form.values.appName}
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
          {enableAds && generatedPrometheus && (
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
                  <Tabs.Tab value="config">Configuration</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="prometheus" pt="md">
                  <Stack gap="md">
                    <Group justify="apart">
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
                          onClick={() => downloadFile(generatedPrometheus, `${form.values.appName}-prometheus-rules.yaml`)}
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

                <Tabs.Panel value="config" pt="md">
                  <Stack gap="md">
                    <Group justify="apart">
                      <Title order={3}>Configuration</Title>
                      <Group>
                        <Button
                          variant="light"
                          leftSection={<IconCopy size={18} />}
                          onClick={() => navigator.clipboard.writeText(generatedConfig)}
                        >
                          Copy
                        </Button>
                        <Button
                          leftSection={<IconDownload size={18} />}
                          onClick={() => downloadFile(generatedConfig, `${form.values.appName}-config.yaml`)}
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
                      {generatedConfig}
                    </Code>

                    <Alert color="blue" title="Save and Resume">
                      <Text size="sm">
                        Download this configuration file to save your work. You can upload it later using the "Upload Config" button to resume where you left off.
                      </Text>
                    </Alert>
                  </Stack>
                </Tabs.Panel>
              </Tabs>

              <Divider my="md" />

              <Text size="sm" c="dimmed">
                <strong>Required Metrics:</strong>
                <ul style={{ marginTop: '8px', marginBottom: '0' }}>
                  <li><code>{form.values.livenessQuery || `up{job="${form.values.appName}"}`}</code> - Liveness checks</li>
                  {form.values.sloEnabled && (
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
          {enableAds && generatedPrometheus && (
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
            }}
          >
            {/* Links */}
            <Group justify="center" gap="xl" style={{ marginBottom: '1rem' }}>
              <a
                href="https://cardinality.cloud/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 500,
                }}
              >
                <IconExternalLink size={18} />
                <span>Cardinality Cloud</span>
              </a>

              <a
                href="https://github.com/CardinalityCloud/prometheus-alert-generator"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 500,
                }}
              >
                <IconBrandGithub size={18} />
                <span>GitHub</span>
              </a>

              <a
                href="https://github.com/CardinalityCloud/prometheus-alert-generator/issues"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 500,
                }}
              >
                <IconBug size={18} />
                <span>Report Issues</span>
              </a>

              <Link
                to="/faq"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 500,
                }}
              >
                <IconQuestionMark size={18} />
                <span>FAQ</span>
              </Link>

              <a
                href="https://cardinality.cloud/blog/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 500,
                }}
              >
                <IconNews size={18} />
                <span>Blog</span>
              </a>

              <a
                href="mailto:jjneely@cardinality.cloud?subject=Prometheus Alert Generator Feedback"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 500,
                }}
              >
                <IconMail size={18} />
                <span>Send Feedback</span>
              </a>
            </Group>

            {/* Copyright */}
            <Text size="sm" c="dimmed" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              © 2025 Cardinality Cloud, LLC. Licensed under Apache 2.0.
            </Text>

            {/* Version Info */}
            <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
              v{__APP_VERSION__} (
              <a
                href={`https://github.com/CardinalityCloud/prometheus-alert-generator/commit/${__GIT_COMMIT_SHA__}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                {__GIT_COMMIT_SHA__}
              </a>
              ) • Built: {new Date(__BUILD_DATE__).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </Text>
          </Paper>
        </Stack>
      </Container>
      </div>
    </MantineProvider>
  );
}
