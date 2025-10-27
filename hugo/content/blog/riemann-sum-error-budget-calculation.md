---
title: "How does this tool efficiently calculate error budget over long SLO windows?"
date: 2025-10-16
author: "Cardinality Cloud"
tags: ["faq", "technical", "prometheus", "performance"]
description: "Deep dive into the Riemann Sum-inspired technique for efficient error budget calculations."
math: true
---

This tool uses a Riemann Sum-inspired technique to efficiently calculate error budget consumption over long time windows (like 30 days) without requiring expensive range queries over raw counter metrics.

## The Problem

Calculating error budget remaining over a 30-day window naively would require something like:

```promql
1 - (sum_over_time(rate(errors[5m])[30d]) / sum_over_time(rate(total[5m])[30d]))
```

This is computationally expensive and can cause Prometheus query timeouts, especially with high cardinality metrics.

## The Riemann Sum Solution

Instead, this tool generates a recording rule that pre-computes the error ratio at 5-minute intervals:

```promql
# Error ratio over 5m window (evaluated every 1m by default)
job:slo_burn:ratio_5m = rate(errors[5m]) / rate(total[5m])
```

Then, to calculate error budget remaining over the full 30-day window, we use:

```promql
1 - (avg_over_time(job:slo_burn:ratio_5m[30d]) / error_budget)
```

## Why This Works: The Math

This technique is inspired by Riemann Sums from calculus. The error budget consumed over a time period is:

$$\int_0^T \text{error\_rate}(t) \, dt \, / \, \int_0^T \text{total\_rate}(t) \, dt$$

By sampling the error ratio at regular intervals (every evaluation, typically 1m), we're approximating this integral as:

$$\frac{1}{n} \times \sum_{i=1}^{n} \frac{\text{error\_rate}(t_i)}{\text{total\_rate}(t_i)}$$

This is exactly what `avg_over_time(job:slo_burn:ratio_5m[30d])` computes - it takes the average of all 5-minute error ratio samples over the 30-day window. The 5-minute window smooths out instantaneous spikes while the evaluation interval (1m) ensures we sample frequently enough to capture meaningful changes.

## Key Advantages

- **Performance**: Queries only pre-computed recording rule samples, not raw metrics
- **Accuracy**: With 1-minute evaluation intervals, we get ~43,200 samples over 30 days, providing high accuracy
- **Scalability**: Query cost is constant regardless of request rate or metric cardinality
- **Simplicity**: Single `avg_over_time()` function instead of complex nested aggregations

## The Trade-off

The accuracy depends on:
- Evaluation interval (shorter = more samples = more accurate)
- Recording rule window (5m provides good balance between smoothing and responsiveness)

With the default 1-minute evaluation interval, the approximation error is negligible for practical SLO monitoring.

## Historical Context

This approach is similar to how Prometheus's `recording rules` were designed - pre-compute expensive aggregations and then query the results. The connection to Riemann Sums makes the mathematical foundation clear: we're numerically integrating the error rate over time using the midpoint rule with small step sizes.
