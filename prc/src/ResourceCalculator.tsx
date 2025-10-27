import { useState, useEffect, useRef } from 'react';
import { Container, Card, Button, Badge, Form } from 'react-bootstrap';
import * as Plot from '@observablehq/plot';
import { InfoBox } from './components/InfoBox';

export function ResourceCalculator() {
  const [timeSeriesInput, setTimeSeriesInput] = useState<number | string>('');
  const [scrapeInterval, setScrapeInterval] = useState<number | string>(60);
  const [retentionDays, setRetentionDays] = useState<number | string>(30);
  const [userTimeSeries, setUserTimeSeries] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Base data points for the chart
  const baseTimeSeriesPoints = [1000, 5000, 10000, 50000, 100000, 500000, 1000000, 2000000, 5000000, 10000000];

  // Example configuration points (to show as dots)
  const examplePoints = [
    { timeSeries: 100000, memoryGB: (100000 * 7.5) / (1024 * 1024) },
    { timeSeries: 200000, memoryGB: (200000 * 7.5) / (1024 * 1024) },
    { timeSeries: 500000, memoryGB: (500000 * 7.5) / (1024 * 1024) },
    { timeSeries: 1000000, memoryGB: (1000000 * 7.5) / (1024 * 1024) },
    { timeSeries: 2000000, memoryGB: (2000000 * 7.5) / (1024 * 1024) },
    { timeSeries: 5000000, memoryGB: (5000000 * 7.5) / (1024 * 1024) },
    { timeSeries: 10000000, memoryGB: (10000000 * 7.5) / (1024 * 1024) },
  ];

  // User's specific point for highlighting
  const userPoint = userTimeSeries && userTimeSeries >= 1000 ? {
    timeSeries: userTimeSeries,
    memoryGB: (userTimeSeries * 7.5) / (1024 * 1024),
    minMemoryGB: (userTimeSeries * 7) / (1024 * 1024),
    maxMemoryGB: (userTimeSeries * 9) / (1024 * 1024),
    cpuCores: Math.max(2, Math.round((userTimeSeries * 7.5) / (1024 * 1024) / 4)),
    // Disk space calculation: samples * bytes per sample / GB conversion
    // Samples per series = (retentionDays * 86400 seconds/day) / scrapeInterval
    // Total samples = timeSeries * samples per series
    // Bytes = total samples * 1.5 bytes per sample
    // Add 20% buffer for WAL (Write-Ahead Log)
    diskSpaceGB: (userTimeSeries * (Number(retentionDays) * 86400 / Number(scrapeInterval)) * 1.5) / (1024 * 1024 * 1024) * 1.2,
  } : null;

  // Render chart with Observable Plot
  useEffect(() => {
    if (!chartRef.current) return;

    // Clear previous chart
    chartRef.current.innerHTML = '';

    // Extend time series points if user input exceeds max
    let timeSeriesPoints = [...baseTimeSeriesPoints];
    if (userPoint && userPoint.timeSeries > 10000000) {
      const maxPoint = Math.ceil(userPoint.timeSeries * 1.5);
      timeSeriesPoints.push(userPoint.timeSeries, maxPoint);
      timeSeriesPoints.sort((a, b) => a - b);
    }

    // Generate line data
    const recommendedLine = timeSeriesPoints.map(ts => ({
      timeSeries: ts,
      memoryGB: (ts * 7.5) / (1024 * 1024)
    }));

    const lowerBound = timeSeriesPoints.map(ts => ({
      timeSeries: ts,
      memoryGB: (ts * 7) / (1024 * 1024)
    }));

    const upperBound = timeSeriesPoints.map(ts => ({
      timeSeries: ts,
      memoryGB: (ts * 9) / (1024 * 1024)
    }));

    const marks = [
      // Shaded area between bounds
      Plot.areaY(timeSeriesPoints.map((ts, i) => ({
        timeSeries: ts,
        lower: lowerBound[i].memoryGB,
        upper: upperBound[i].memoryGB
      })), {
        x: "timeSeries",
        y1: "lower",
        y2: "upper",
        fill: "#38d9a9",
        fillOpacity: 0.2
      }),

      // Lower bound line (7 KiB)
      Plot.line(lowerBound, {
        x: "timeSeries",
        y: "memoryGB",
        stroke: "#38d9a9",
        strokeOpacity: 0.4,
        strokeWidth: 1.5,
        strokeDasharray: "4,4"
      }),

      // Upper bound line (9 KiB)
      Plot.line(upperBound, {
        x: "timeSeries",
        y: "memoryGB",
        stroke: "#38d9a9",
        strokeOpacity: 0.4,
        strokeWidth: 1.5,
        strokeDasharray: "4,4"
      }),

      // Recommended line (7.5 KiB) - prominent
      Plot.line(recommendedLine, {
        x: "timeSeries",
        y: "memoryGB",
        stroke: "#12b886",
        strokeWidth: 2.5
      }),

      // Example points
      Plot.dot(examplePoints, {
        x: "timeSeries",
        y: "memoryGB",
        fill: "#1971c2",
        r: 5,
        title: (d) => `${formatNumber(d.timeSeries)} time series\nRecommended: ${d.memoryGB.toFixed(2)} GB\nSafe Range: ${((d.timeSeries * 7) / (1024 * 1024)).toFixed(2)} - ${((d.timeSeries * 9) / (1024 * 1024)).toFixed(2)} GB`
      }),

      // Zero rule
      Plot.ruleY([0])
    ];

    // Add user point if it exists
    if (userPoint) {
      marks.push(
        Plot.dot([userPoint], {
          x: "timeSeries",
          y: "memoryGB",
          fill: "#fa5252",
          r: 7,
          stroke: "white",
          strokeWidth: 2,
          title: (d) => `${formatNumber(d.timeSeries)} time series (Your Config)\nRecommended: ${d.memoryGB.toFixed(2)} GB\nSafe Range: ${d.minMemoryGB.toFixed(2)} - ${d.maxMemoryGB.toFixed(2)} GB\nCPU Cores: ${d.cpuCores}`
        })
      );
    }

    // Calculate dynamic domains
    let maxMemory = 80;
    let maxTimeSeries = 10000000;

    if (userPoint) {
      if (userPoint.memoryGB > maxMemory) {
        maxMemory = Math.ceil(userPoint.memoryGB * 1.2);
      }
      if (userPoint.timeSeries > maxTimeSeries) {
        maxTimeSeries = Math.ceil(userPoint.timeSeries * 1.5);
      }
    }

    const formatNumber = (d: number) => {
      if (d >= 1000000) return `${(d / 1000000).toFixed(1)}M`;
      if (d >= 1000) return `${(d / 1000).toFixed(0)}K`;
      return d.toString();
    };

    const plot = Plot.plot({
      marks: marks,
      x: {
        type: "log",
        label: "Active Time Series",
        grid: true,
        domain: [1000, maxTimeSeries],
        tickFormat: formatNumber
      },
      y: {
        label: "Memory Required (GB)",
        grid: true,
        domain: [0, maxMemory]
      },
      marginLeft: 60,
      marginBottom: 50,
      marginTop: 30,
      width: chartRef.current.clientWidth,
      height: 500,
      style: {
        fontSize: "13px",
        background: "white"
      }
    });

    chartRef.current.appendChild(plot);
  }, [userTimeSeries]);

  const handleCalculate = () => {
    const value = typeof timeSeriesInput === 'number' ? timeSeriesInput : parseInt(timeSeriesInput);
    if (value && value >= 1000) {
      setUserTimeSeries(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCalculate();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      paddingTop: '2rem',
      paddingBottom: '4rem'
    }}>
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
                        <label className="form-label mb-0 fw-semibold">Active Time Series</label>
                        <Badge bg="danger">Required</Badge>
                      </div>
                      <Form.Control
                        type="number"
                        placeholder="e.g., 250000"
                        min={1000}
                        step={1000}
                        value={timeSeriesInput}
                        onChange={(e) => setTimeSeriesInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        required
                      />
                      <small className="text-muted">
                        The number of unique time series your Prometheus instance tracks
                      </small>
                    </div>

                    <div className="d-flex gap-3 flex-wrap">
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <label className="form-label fw-semibold">Scrape Interval (seconds)</label>
                        <Form.Control
                          type="number"
                          min={1}
                          step={1}
                          value={scrapeInterval}
                          onChange={(e) => setScrapeInterval(e.target.value)}
                          onKeyPress={handleKeyPress}
                        />
                        <small className="text-muted">
                          How often Prometheus scrapes metrics
                        </small>
                      </div>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <label className="form-label fw-semibold">Retention Period (days)</label>
                        <Form.Control
                          type="number"
                          min={1}
                          step={1}
                          value={retentionDays}
                          onChange={(e) => setRetentionDays(e.target.value)}
                          onKeyPress={handleKeyPress}
                        />
                        <small className="text-muted">
                          How long to keep historical data
                        </small>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleCalculate}
                      style={{
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      Calculate
                    </Button>
                  </div>
                </div>

                {userPoint && (
                  <InfoBox>
                    <div className="d-flex flex-column gap-2">
                      <h5 className="fw-bold">
                        For {userTimeSeries?.toLocaleString()} active time series:
                      </h5>
                      <div className="d-flex gap-4 flex-wrap">
                        <div>
                          <small className="text-muted">Recommended Memory</small>
                          <h3 className="fw-bold mb-0">{userPoint.memoryGB.toFixed(2)} GB</h3>
                        </div>
                        <div>
                          <small className="text-muted">Safe Range</small>
                          <h3 className="fw-bold mb-0">{userPoint.minMemoryGB.toFixed(2)} GB - {userPoint.maxMemoryGB.toFixed(2)} GB</h3>
                        </div>
                        <div>
                          <small className="text-muted">Recommended CPU Cores</small>
                          <h3 className="fw-bold mb-0">{userPoint.cpuCores}</h3>
                        </div>
                        <div>
                          <small className="text-muted">Disk Space Required</small>
                          <h3 className="fw-bold mb-0">
                            {userPoint.diskSpaceGB >= 1024
                              ? `${(userPoint.diskSpaceGB / 1024).toFixed(2)} TB`
                              : `${userPoint.diskSpaceGB.toFixed(2)} GB`}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </InfoBox>
                )}
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex flex-column gap-3">
                <h5 className="fw-semibold">Memory Requirements by Time Series</h5>

                <div ref={chartRef} style={{ width: '100%', overflow: 'auto' }} />

                <Card bg="light" border="light">
                  <Card.Body>
                    <div className="d-flex flex-column gap-2">
                      <small className="fw-semibold">Legend</small>
                      <div className="d-flex gap-4 flex-wrap">
                        <div className="d-flex gap-2 align-items-center">
                          <div style={{
                            width: 30,
                            height: 3,
                            backgroundColor: '#12b886',
                            borderRadius: 2
                          }} />
                          <small>Recommended: 7.5 KiB per series</small>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                          <div style={{
                            width: 30,
                            height: 2,
                            border: '1px dashed #38d9a9',
                            borderTop: 'none',
                            borderBottom: 'none'
                          }} />
                          <small>Safe Range (7-9 KiB per series)</small>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                          <div style={{
                            width: 8,
                            height: 8,
                            backgroundColor: '#1971c2',
                            borderRadius: '50%'
                          }} />
                          <small>Example configurations</small>
                        </div>
                        {userPoint && (
                          <div className="d-flex gap-2 align-items-center">
                            <div style={{
                              width: 12,
                              height: 12,
                              backgroundColor: '#fa5252',
                              borderRadius: '50%',
                              border: '2px solid white',
                              boxShadow: '0 0 0 1px #fa5252'
                            }} />
                            <small className="fw-semibold text-danger">Your configuration</small>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
}
