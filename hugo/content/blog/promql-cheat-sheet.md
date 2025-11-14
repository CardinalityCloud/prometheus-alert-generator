---
title: "PromQL Cheat Sheet - Complete Reference Guide"
date: 2025-11-07
author: "Cardinality Cloud"
tags: ["prometheus", "promql", "reference", "monitoring"]
description: "Complete PromQL cheat sheet with practical examples for Prometheus monitoring and alerting. Covers data types, selectors, operators, functions, and common query patterns."
math: true
---

Quick reference for Prometheus Query Language (PromQL) with practical examples
for monitoring, alerting, and SLO calculations. Covers essential functions,
aggregations, and common patterns for effective Observability.

<!--more-->

## Metric Types

| Type | Description | Use Case |
|------|-------------|----------|
|**Counter**| Monotonically increasing counter, resets on application restart|Track requests or bytes processed -- basis for rates|
|**Gauge**  | Can increase or decrease over time, does not reset | Size, queue depth, temperature, number of concurrent threads |
|**Summary** | A set of Counters tracking averages and quantiles | Sizes or latencies of rapid fire events -- quantiles can NOT be aggregated|
|**Histogram** | A set of Counters for tracking arbitrary quantiles | Sizes or latencies of rapid fire events -- can be aggregated |

## Data Types

| Type | Description | PromQL Example |
|------|-------------|---------|
| **Scalar** | Simple floating-point value | `3.14` |
| **Instant Vector** | Set of time series with single sample per series | `http_requests_total` |
| **Range Vector** | Set of time series with range of samples | `http_requests_total[5m]` |
| **String** | String literal (limited use) | `"some text"` |

## Selectors &amp; Filtering

### Basic Selectors

Select all time series for a metric named `http_requests_total`:
```promql
http_requests_total
```

### Label Matchers

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Exact match | `http_requests_total{status_code="500"}` |
| `!=` | Not equal | `http_requests_total{status_code!="500"}` |
| `=~` | Regex match | `http_requests_total{status_code=~"5.."}` |
| `!~` | Regex not match | `http_requests_total{status_code!~"5.."}` |

Multiple label filters:
```promql
http_requests_total{method="GET", status=~"2.."}
```

### Time Ranges

**Range Vector Selector:**
```promql
http_requests_total[5m]  # Last 5 minutes of data
```

**Time Units:**
- `ms` - milliseconds
- `s` - seconds
- `m` - minutes
- `h` - hours
- `d` - days
- `w` - weeks
- `y` - years

**Offset modifier** Compare with data from the past:
```promql
rate(http_requests_total[1h]) <= rate(http_requests_total[1h] offset 1w)
```

## Operators

### Arithmetic Operators

Basic math operators: `+`, `-`, `*`, `/`, `%`, `^`

**Example - Converting Bytes:**
| Unit | Name    |Sloppy Name |PromQL Expression |
|------|---------|------------|------------------|
| KiB  |Kibibyte | Kilobyte   | `node_memory_bytes / 2^10` |
| MiB  |Mebibyte | Megabyte   | `node_memory_bytes / 2^20` |
| GiB  |Gibibyte | Gigabyte   | `node_memory_bytes / 2^30` |
| TiB  |Tebibyte | Terabyte   | `node_memory_bytes / 2^40` |
| PiB  |Pebibyte | Petabyte   | `node_memory_bytes / 2^50` |

### Comparison Operators

| Operator | Description |
|----------|-------------|
| `==` | Equal |
| `!=` | Not equal |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |

**Comparison filters results:**
```promql
http_requests_total > 100
```

### Logical Operators

- `and` - Intersection
- `or` - Union
- `unless` - Complement

**Combine conditions:**
```promql
up{job="prometheus"} == 1 and on(instance) rate(http_requests_total[5m]) > 10
```

## Essential Functions

### Rate Functions (for Counters)

{{< tip >}}
Default to using `rate()` for alerting and graphs. Use `irate()` for volatile
metrics where you want to see quick changes at high resolution (like CPU 
usage).  Remember this as the "mad rate function."
{{< /tip >}}

**`rate()` - Per-second rate of increase interpolated from the last 5m**
```promql
rate(http_requests_total[5m])
```
Use for counters that always increase. Handles counter resets.  Always
normalized to per-second.

**`irate()` - Instant rate (last 2 samples within range)**
```promql
irate(http_requests_total[5m])
```
Uses the last two samples within the time range. More sensitive to short-term
spikes. Good for CPU metrics.  Normalized to per-second.

**`increase()` - Total increase over time range**
```promql
increase(http_requests_total[1h])
```
Extrapolates total increase. Use for counters.  Effectively `rate()`
multiplied by the number of seconds in the time range.

### Aggregation Functions

Reduces many time series into fewer time series.

| Function | Operation | Example | Description |
|----------|-----------|---------|-------------|
| `sum()` | Sum of all values | `sum(rate(http_requests_total[5m]))` | Sum all rates for system-wide throughput
| `avg()` | Average of all values | `avg(rate(http_requests_total[5m]))` | Average rate of each container or pod
| `min()` | Minimum value | `min(rate(http_requests_total[5m]))` | Lowest rate or throughput for each container or pod
| `max()` | Maximum value | `max(rate(http_requests_total[5m]))` | Highest rate or throughput for each container or pod
| `count()` | Count of elements | `count(rate(http_requests_total[5m]))` | Number of active containers or pods
| `stddev()` | Standard deviation | `stddev(rate(http_requests_total[5m]))` | How many seconds is 1 standard deviation assuming a normal distribution
| `stdvar()` | Standard variance | `stdvar(rate(http_requests_total[5m]))` | Standard variance assuming a normal distribution -- are all containers processing at similar rates?
| `topk()` | Largest *k* values | `topk(10, rate(http_requests_total[5m]))` | 10 containers or pods with the highest rates -- does not modify labels
| `bottomk()` | Smallest *k* values | `bottomk(10, rate(http_requests_total[5m]))` | 10 containers or pods with the lowest or smallest rates -- does not modify labels
| `quantile()` | Value at *q*th quantile | `quantile(0.5, rate(http_requests_total[5m]))` | Median rate of throughput for all containers or pods

### Aggregation with BY and WITHOUT

Keep or drop specific labels.

**Group by specific labels:**
```promql
sum by (job, instance) (rate(http_requests_total[5m]))
```

**Exclude specific labels:**
```promql
sum without (pod) (rate(http_requests_total[5m]))
```

### Time &amp; Date Functions

These all (except `time()`) take a unix timestamp as an optional first
argument.  Values returned are all in UTC.

- `time()`              - Current Unix timestamp
- `minute()`            - Minute of hour (0-59)
- `hour()`              - Hour of day (0-23)
- `day_of_week()`       - Day of week (0-6, Sunday=0)
- `day_of_month()`      - Day of month (1-31)
- `days_in_month()`     - Number of days in month (28-31)
- `month()`             - Month (1-12)
- `year()`              - Current year

**Example - Repeating Test Patterns**

```promql
- alert: TestAlert
  annotations:
    description: |
      This alert fires every 2 hours and resolves after 60 minutes.
    runbook_url: https://example.com
    summary: Test that alerts are working
  expr: |
    vector(1)
    unless (
      (hour() % 2 == 0)
    )
  labels:
    severity: none
```

**Example - Alert only during business hours:**

{{< warning title="Anti-Pattern" >}}
This works only if you live in Greenwich, England and ignore British Summer
Time.  Don't do this, there are better ways.
{{< /warning >}}

```promql
http_errors > 100 and on() hour() >= 9 and on() hour() < 17
```

### Math Functions

**Rounding:**
- `round()` - Round to nearest integer, or nearest multiple of second argument
  that defaults to 1
- `ceil()` - Round up away from zero
- `floor()` - Round down toward zero

**Other Math:**
- `abs()` - Absolute value
- `sqrt()` - Square root
- `exp()` - Exponential
- `ln()` - Natural logarithm
- `log2()` - Log base 2
- `log10()` - Log base 10

Need [trigonometric functions?](https://prometheus.io/docs/prometheus/latest/querying/functions/#trigonometric-functions)

### Quantile Functions

**`quantile()` - quantile aggregation**
```promql
quantile(0.95, rate(http_requests_total[5m]))
```
Get 95th percentile of the containers or pods HTTP rate of requests per
second.  Used to detect if a pod is much slower or faster than the rest.

**`histogram_quantile()` - Estimate quantile from histogram**
```promql
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

Calculate the 95th percentile from a histogram aggregating all pods or
containers together.  Useful to judge have behavior is anomalous vs expected.

### Prediction Functions

**`predict_linear()` - Linear prediction**

{{< tip title="Modeling Data is Hard" >}}
This uses simple linear regression to make predictions.  If the data doesn't
look like a mostly straight line that could be modeled with $y = mx + b$ then
it won't create very good predictions.  File space free isn't well modeled by
this.
{{< /tip >}}

```promql
predict_linear(node_filesystem_free_bytes[1h], 4 * 3600)
```
Predict disk space in 4 hours based on last hour's trend.

**`deriv()` - Derivative normalized to per-second**
```promql
deriv(node_memory_active_bytes[10m])
```
Rate of change over time.  Useful for Gauge metrics.  Can be negative.  This
example would show how fast memory is being consumed on a VM.

### Sorting Functions

| PromQL Function | Description |
|-----------------|-------------|
| `sort()`        | Sort smallest first, greatest last |
| `sort_desc()`   | Sort greatest first, smallest last |
| `topk(5, ...)`  | Top 5 values |
| `bottomk(5, ...)`| Bottom 5 values |

## Common Query Patterns

### CPU Usage

**CPU usage per instance:**

{{< tip title="CPU Usage is Tough to Track" >}}
With multi-core and fractional-core provisioning in Kubernetes and modern
environments, it is most effective to count the number of CPU cores in use.
Avoid using percentages here.
{{< /tip >}}


Node-Exporter Metrics:
```promql
sum by (instance) (rate(node_cpu_seconds_total{mode!="idle", mode!="iowait", mode!="steal"}[5m]))
```

Kubernetes Metrics:
```promql
sum by (pod) (rate(container_cpu_usage_seconds_total[5m]))
```

### Memory Usage

**Memory usage percentage:**

Node-Exporter Metrics:
```promql
100 * (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
/
node_memory_MemTotal_bytes
```

Kubernetes Metrics:
```promql
100 * sum by (pod) (container_memory_working_set_bytes)
/
sum by (pod) (kube_pod_container_resource_limits{resource="memory"})
```

### Disk Usage

**Disk usage percentage:**

Node-Exporter Metrics:
```promql
100 * (node_filesystem_size_bytes - node_filesystem_free_bytes)
/
node_filesystem_size_bytes
```

Kubernetes PersistentVolume Metrics:
```promql
100 * (1 - kubelet_volume_stats_available_bytes / kubelet_volume_stats_capacity_bytes)
```

### HTTP Error Rate

**Percentage of 5xx errors:**
```promql
100 * sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```

### Request Latency (p95)

**95th percentile latency:**
```promql
histogram_quantile(0.95, sum by(le) (rate(http_request_duration_seconds_bucket[5m])))
```

### Kubernetes Pod Restarts

**Pods restarting frequently:**
```promql
increase(kube_pod_container_status_restarts_total[30m]) > 1
```

### Available Services

**Count of healthy targets:**
```promql
sum(up{job="myapp"})
```

**Percentage of healthy targets:**
```promql
100 * avg(up{job="myapp"})
```

## Alert Rule Examples

### High CPU Throttling Alert

{{< warning title="CPU Usage Alerts" >}}
Generally CPU usage alerts are considered harmful.  Instead, we want to know
if Kubernetes is forcing our applications off the CPU for attempting to use
more than their assigned limit.
{{< /warning >}}

```yaml
- alert: HighCPUThrottles
  expr: |
    100 * sum(
      increase(
        container_cpu_cfs_throttled_periods_total{container!=""}[5m]
      )
    ) by (container, pod, namespace)
    /
    sum(
      increase(
        container_cpu_cfs_periods_total[5m]
      )
    ) by (container, pod, namespace)
    > 25
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High CPU on {{ $labels.instance }}"
    description: "CPU slices were throttled {{ $value | humanizePercentage }} over the last 5m"
```

### High Memory Alert

```yaml
- alert: HighMemory
  expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 90
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High memory usage on {{ $labels.instance }}"
    description: "Memory usage is {{ $value | humanizePercentage }}"
```

### High Error Rate

```yaml
- alert: HighErrorRate
  expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High 5xx error rate"
    description: "Error rate is {{ $value | humanizePercentage }}"
```

### Pod Crash Loop

```yaml
- alert: PodCrashLooping
  expr: increase(kube_pod_container_status_restarts_total[15m]) > 1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Pod {{ $labels.pod }} is crash looping"
    description: "Pod in namespace {{ $labels.namespace }} restarting frequently"
```

## Best Practices

{{< tip title="Use rate() for counters" >}}
Always use `rate()` or `irate()` when querying counter metrics. Never query counters directly.
{{< /tip >}}

{{< tip title="Choose appropriate time ranges" >}}
For `rate()`, use at least 2-3x your scrape interval. If scraping every 30s, use `[2m]` or longer.
60s scrapes?  Use `[5m]`.
{{< /tip >}}

{{< warning title="Rate Before Aggregation" >}}
Always calculate the `rate()` first then `sum()` or aggregate as needed.
PromQL is designed to help enforce this.  Taking the rate last is NOT THE SAME
OPERATION and you will get unexpected results!
{{< /warning >}}

{{< warning title="Avoid high cardinality" >}}
Do not use labels with unbounded values sets like user IDs, timestamps,
email addresses, IPs, etc.  If you need this, you really need tracing.
{{< /warning >}}

{{< warning title="Use 'for' clause in alerts" >}}
Always use a `for` duration to avoid flapping alerts from temporary spikes.
`5m` or more is a good place to start.
{{< /warning >}}

{{< tip title="Use recording rules for complex queries" >}}
Pre-calculate expensive queries that are used in multiple dashboards or alerts.
Such as SLOs and Error Budgets.
{{< /tip >}}

## Quick Reference

### Recording Rule Example

```yaml
groups:
  - name: example
    interval: 30s
    rules:
      - record: instance:node_cpu:avg_rate5m
        expr: avg by(instance) (rate(node_cpu_seconds_total[5m]))
```

### Template Variables in Annotations

```yaml
{{ $labels.instance }}           # Label value
{{ $value }}                      # Current value
{{ $value | humanize }}           # Human-readable value (1000 -> 1k)
{{ $value | humanizePercentage }} # Format as percentage
{{ $value | humanizeDuration }}   # Format as duration
```

## Further Resources

- [Official PromQL Documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [PromQL for Humans](https://timber.io/blog/promql-for-humans/)
- [Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [Best Practices](https://prometheus.io/docs/practices/naming/)

---

**Generate alerts automatically:** Use our [Prometheus Alert Generator](/pag/) to create SLO-based alerting rules with multi-window burn rate detection.
