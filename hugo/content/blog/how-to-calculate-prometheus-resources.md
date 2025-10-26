---
title: "How to Calculate Prometheus Resource Requirements"
date: 2025-01-08
author: "Cardinality Cloud"
tags: ["faq", "prometheus", "resources", "capacity-planning"]
description: "Learn how to calculate memory, CPU, and disk space requirements for your Prometheus deployment."
---

Sizing your Prometheus deployment correctly is crucial for reliable monitoring. Here's how to calculate the resources you need.

## Key Metrics

Three factors determine Prometheus resource requirements:

1. **Active time series**: Number of unique metric streams
2. **Scrape interval**: How often Prometheus collects metrics (default: 60s)
3. **Retention period**: How long to keep historical data (default: 15 days)

## Memory Requirements

Prometheus keeps recent data in memory for fast queries.

**Rule of thumb**: 7-7.5 KiB per active time series

```
Memory (GB) = (Active Time Series × 7.5 KiB) / 1024²
```

**Example**: 1 million time series
```
Memory = (1,000,000 × 7.5 KiB) / 1024²
       = 7.15 GB
```

**Safety margin**: Add 20-30% for query buffers and spikes.

## CPU Requirements

CPU usage scales with:
- Number of time series
- Query complexity
- Scrape targets and frequency

**General guideline**:
```
CPU cores = max(2, memory_gb / 4)
```

For 7.15 GB memory: 2 cores minimum, recommend 2-4 cores.

## Disk Space Requirements

Prometheus compresses samples efficiently on disk.

**Formula**:
```
Disk (GB) = (
  Time Series ×
  (Retention Days × 86400 / Scrape Interval) ×
  1.5 bytes per sample
) / 1024³ × 1.2
```

The 1.2 factor adds 20% buffer for WAL (Write-Ahead Log).

**Example**: 1M time series, 30-day retention, 60s scrapes
```
Samples = 1,000,000 × (30 × 86400 / 60) = 43.2B samples
Disk = (43.2B × 1.5 bytes) / 1024³ × 1.2
     = 60.4 GB
```

## Using the Resource Calculator

Our [Resource Calculator](/app/resources) does the math for you:

1. Enter active time series count
2. Set scrape interval (default: 60s)
3. Set retention period (default: 30 days)

Get instant calculations for memory, CPU, and disk requirements with visualization showing safe operating ranges.

## Finding Your Time Series Count

To find your current time series count:

```promql
# Current active time series
prometheus_tsdb_head_series
```

## Scaling Considerations

As you grow:

- **&lt;100K series**: Single Prometheus instance
- **100K-1M series**: Single instance with good resources
- **1M-10M series**: Consider federation or Thanos
- **&gt;10M series**: Distributed setup (Cortex, Thanos, Mimir)

## Best Practices

1. **Monitor your monitoring**: Set alerts on Prometheus resource usage
2. **Regular capacity reviews**: Check time series growth trends monthly
3. **Label hygiene**: High-cardinality labels = more time series
4. **Retention policy**: Longer retention = more disk, consider remote storage

## Related Tools

- [Resource Calculator](/app/resources) - Calculate your requirements
- [Alert Generator](/app/) - Set up monitoring for your Prometheus instance
