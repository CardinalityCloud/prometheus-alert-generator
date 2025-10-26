---
title: "How do I size my Prometheus deployment?"
date: 2025-01-12
author: "Cardinality Cloud"
tags: ["faq", "prometheus", "capacity-planning", "resources"]
description: "Comprehensive guide to calculating memory, CPU, and disk requirements for Prometheus."
math: true
---

Properly sizing a Prometheus deployment is critical for reliable monitoring. Our Resource Calculator helps you estimate memory, CPU, and disk requirements based on your metrics workload.

## The Three Key Inputs

1. **Active Time Series**: The number of unique time series your Prometheus instance tracks
2. **Scrape Interval**: How often Prometheus collects metrics (default: 60 seconds)
3. **Retention Period**: How long to store historical data (default: 30 days)

## Finding Your Active Time Series Count

If you already have Prometheus running, query:

```promql
prometheus_tsdb_head_series
```

This metric shows the current number of time series in the Prometheus TSDB (Time Series Database) head block. If you're planning a new deployment, estimate based on:
- Number of targets (servers, containers, etc.)
- Metrics per target (typically 500-2000 per host, 50-200 per container)
- Expected growth over the retention period

## Resource Calculations

### Memory Requirements

Prometheus memory usage scales linearly with active time series:

$$\text{Memory (GB)} = \frac{\text{time\_series} \times 7.5 \text{ KiB}}{1024^2}$$

- **Recommended**: 7.5 KiB per time series
- **Safe Range**: 7-9 KiB per time series

The actual memory usage depends on:
- **Series churn rate**: How frequently time series appear and disappear
- **Label cardinality**: Number of unique label combinations
- **Sample rate**: Higher scrape frequencies increase memory pressure

### CPU Requirements

CPU usage is harder to predict as it depends on query complexity, but a general rule:

$$\text{CPU Cores} = \max\left(2, \left\lfloor\frac{\text{Memory (GB)}}{4}\right\rfloor\right)$$

Allocate 1 core per 4GB of memory, with a minimum of 2 cores. CPU load increases with:
- **Recording rules**: Pre-computing aggregations
- **Alert rule evaluations**: Complex PromQL queries
- **Query load**: Dashboard refreshes, API queries, ad-hoc exploration

### Disk Space Requirements

Disk usage depends on retention period and sample density:

$$\text{Disk (GB)} = \frac{\text{time\_series} \times \text{samples\_per\_series} \times 1.5 \text{ bytes}}{1024^3} \times 1.2$$

Where:

$$\text{samples\_per\_series} = \frac{\text{retention\_days} \times 86400}{\text{scrape\_interval}}$$

- **1.5 bytes per sample**: Prometheus's efficient compression based on the [Gorilla compression algorithm](http://www.vldb.org/pvldb/vol8/p1816-teller.pdf) from Facebook
- **1.2x multiplier**: 20% overhead for WAL (Write-Ahead Log) and temporary data

## Interpreting the Chart

The Resource Calculator shows:
- **Green shaded area**: Safe memory range (7-9 KiB per series)
- **Solid green line**: Recommended allocation (7.5 KiB)
- **Blue dots**: Example configurations at common scales
- **Red dot**: Your specific configuration
- **Logarithmic scale**: Better visualization across orders of magnitude (1K to 10M+ series)

## Important Caveats

These estimates are **starting points**, not guarantees. Actual resource usage varies based on:

- **Recording rules**: Each recording rule creates new time series, increasing memory
- **Alert rules**: Complex alert evaluations increase CPU usage
- **Query patterns**: Heavy dashboard loads or complex queries require more CPU
- **Remote write**: Sending data to remote storage adds CPU and network overhead
- **Cardinality explosions**: Poorly designed metrics can create millions of series unexpectedly

## Monitoring Your Actual Usage

After deployment, monitor these Prometheus metrics:

```promql
# Memory usage
process_resident_memory_bytes

# Active time series
prometheus_tsdb_head_series

# Disk usage
prometheus_tsdb_storage_blocks_bytes

# Ingestion rate (samples per second)
rate(prometheus_tsdb_head_samples_appended_total[5m])
```

## Learn More

- [Prometheus Storage Documentation](https://prometheus.io/docs/prometheus/latest/storage/)
- [Operational Aspects (Prometheus Best Practices)](https://prometheus.io/docs/practices/naming/)
- [Cardinality is Key (Robust Perception)](https://www.robustperception.io/cardinality-is-key)
