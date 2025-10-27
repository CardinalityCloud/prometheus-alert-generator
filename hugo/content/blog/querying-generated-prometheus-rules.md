---
title: "How do I query these generated rules in Prometheus to monitor my application?"
date: 2025-10-14
author: "Cardinality Cloud"
tags: ["faq", "prometheus", "promql", "monitoring"]
description: "Practical guide to querying the generated SLO recording rules in Prometheus."
---

Once you've loaded the generated rules into Prometheus, you can query the recording rules directly to monitor your application's health and SLO compliance. Here are the most useful queries:

## Check Current SLO Status

See if your service is currently meeting its SLO target:

```promql
# Success rate over the last 5 minutes
job:slo:ratio_rate5m{job="my-app"}

# Compare to your SLO goal
job:slo:ratio_rate5m{job="my-app"} >= job:slo_goal:ratio{job="my-app"}
```

A value of `1` (true) means you're meeting your SLO, `0` (false) means you're currently below target.

## Error Budget Remaining

Check how much error budget you have left:

```promql
# Remaining error budget as a percentage
job:error_budget:remaining_ratio_30d{job="my-app"} * 100
```

Positive values indicate remaining budget. Values near 0 or negative mean you're at risk of or have breached your SLO.

## Current Burn Rate

See how fast you're consuming error budget right now:

```promql
# Fast burn rate (1h window) - Critical if > 14.4x error budget
job:slo_burn:ratio_1h{job="my-app"} / (1 - (job:slo_goal:ratio{job="my-app"}))

# Slow burn rate (6h window) - Warning if > 6x error budget
job:slo_burn:ratio_6h{job="my-app"} / (1 - (job:slo_goal:ratio{job="my-app"}))
```

A value of `1.0` means you're burning at exactly the rate your error budget allows. Values > 1.0 mean you're consuming budget faster than sustainable.

## Active Liveness

Check how many instances are currently up:

```promql
# Percentage of instances that are up
avg(up{job="my-app"}) * 100
```

## Visualize Trends

For dashboards, these queries show trends over time:

```promql
# SLO compliance over the last 24 hours (shows minimum in 5m intervals)
min_over_time(job:slo:ratio_rate5m{job="my-app"}[24h:5m])

# Error budget trend - see how it changes over time
job:error_budget:remaining_ratio_30d{job="my-app"}

# Error rate spike detection - show max error rate in 1h windows
max_over_time(job:slo_burn:ratio_5m{job="my-app"}[1h])
```

Replace `my-app` with your actual application name, and adjust the `slo_type` label if you're tracking multiple SLO types for the same service.
