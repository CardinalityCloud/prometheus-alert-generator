---
title: "What is an SLO and why should I use SLO-based alerts?"
date: 2025-10-20
author: "Cardinality Cloud"
tags: ["faq", "slo", "alerting", "fundamentals"]
description: "Learn what SLOs are and why SLO-based alerting is superior to traditional threshold-based alerting."
---

Traditional infrastructure alerts page you when CPU hits 80%, but your users are fine. Meanwhile, degraded API performance goes unnoticed because no arbitrary threshold was crossed. An SLO (Service Level Objective) changes this - it's a target reliability goal that measures what users actually experience, like "99.9% of requests succeed over 30 days." Born from Google's Site Reliability Engineering (SRE) practices, SLO-based alerting only pages when user experience is genuinely at risk, eliminating alert fatigue while catching real issues early.

<!--more-->

## Understanding the SLI/SLO/SLA Hierarchy

Before diving deeper into SLOs, it's important to understand how they fit into
the broader reliability framework:

### SLI (Service Level Indicator)

A **Service Level Indicator** is a quantitative measure of service behavior.
It's the actual measurement you take. It can also be called a Key Performance
Indicator (KPI).  Common SLIs include:

- **Availability**: Ratio of successful requests to total requests
- **Latency**: Percentage of requests faster than a threshold (e.g., 95th percentile &lt; 500ms)
- **Error rate**: Percentage of requests that return errors
- **Throughput**: Requests processed per second
- **Durability**: Percentage of data retained without loss
- **Saturation**: How "full" a service instance is expressed as a ratio or
  percentage.  When does the service need to scale up?

**Example SLIs:**
```promql
# Availability SLI
sum(rate(http_requests_total{status=~"2.."}[5m]))
/
sum(rate(http_requests_total[5m]))

# Latency SLI (requests under 500ms)
sum(rate(http_request_duration_bucket{le="0.5"}[5m]))
/
sum(rate(http_request_duration_count[5m]))
```

### SLO (Service Level Objective)

A **Service Level Objective** is a target value or range for an SLI, measured
over a specific time window. It's your *internal* goal.

**Example SLOs:**
- 99.9% of HTTP requests succeed (availability SLO)
- 99% of requests complete in &lt; 500ms (latency SLO)
- 99.95% of writes are durable over 30 days (durability SLO)

SLOs should be:
- **Achievable**: Based on historical performance with some buffer
- **Meaningful**: Aligned with actual user experience
- **Measurable**: Based on observable metrics you control
- **Documented**: Clear ownership and measurement methodology

### SLA (Service Level Agreement)

A **Service Level Agreement** is an explicit or implicit contract with your
users that includes consequences if the SLO is not met. This is the *external*
goal.  SLAs typically have:

- Less strict targets than internal SLOs (buffer for safety)
- Financial or contractual penalties for violations
- Legal implications

**Example SLA:** "We guarantee 99.5% uptime per month. If we fail to meet this, customers receive a 10% service credit."

**Key relationship:** SLA &le; SLO &le; actual performance. Your internal SLO should be stricter than your external SLA to give you room to respond before violating customer agreements.

## Why SLO-Based Alerting is Superior

Traditional monitoring alerts on arbitrary infrastructure thresholds: "CPU &gt; 80%", "Memory &gt; 90%", "Request count &gt; 1000/s". These alerts suffer from several problems:

### Problems with Traditional Threshold Alerts

**1. Disconnected from User Experience**
- High CPU doesn't necessarily mean users are impacted.  In fact, you probably
  want your CPU cores to be well utilized.
- Low latency on individual components doesn't guarantee good user experience.
- User-visible problems may not manifest as infrastructure related issues.

**2. Alert Fatigue**
- Teams become numb to constant paging
- Important alerts get lost in noise
- On-call engineers learn to ignore certain alerts
- Engineers tell each other "It's okay to ignore that alert!"

**3. Lack of Business Context**
- No connection to business objectives
- Unclear which issues require immediate attention.  Where is this alert on
  the [Eisenhower Matrix](https://www.eisenhower.me/eisenhower-matrix/)?
- Difficult to prioritize incident response

**4. Static Thresholds Don't Scale**
- Same thresholds don't work across dev/staging/prod
- Traffic patterns change over time
- Seasonal variations require constant tuning

**5. Reactive Rather Than Predictive**
- Alerts fire after problems occur
- No warning when burning through reliability budget
- Can't distinguish between "annoying" and "urgent"
- It feels like everything is always on fire

### Advantages of SLO-Based Alerting

**1. User-Centric Focus**

SLO-based alerts directly measure what users experience. If users aren't impacted, you don't page. If users are impacted, you always know.

**Example:** Your database CPU is at 95%, but request success rate is still 99.99%. Traditional alerts would page. SLO-based alerts would not, because users are unaffected.

**2. Multi-Window Burn Rate Detection**

Modern SLO alerting uses **burn rates** to determine urgency. Burn rate
measures how quickly you're consuming your **error budget** compared to the target
consumption rate.

With a 99.9% SLO over 30 days:
- **Normal consumption**: 0.1% error budget = 43.2 minutes of allowed downtime per 30 days
- **1x burn rate**: Consuming at the target rate (will exactly hit SLO)
- **14.4x burn rate**: Will exhaust entire month's budget in 2 days (CRITICAL)
- **6x burn rate**: Will exhaust budget in 5 days (WARNING)

**Multi-window approach** requires burn rate to persist across multiple time windows:
- **Fast burn (1h/5m)**: High burn rate sustained for 1 hour, confirmed by 5-minute window
- **Slow burn (6h/30m)**: Moderate burn rate sustained for 6 hours, confirmed by 30-minute window

This dramatically reduces false positives while ensuring real issues are caught early.

**3. Contextual Severity**

Alert severity is determined by burn rate, providing automatic prioritization:

| Burn Rate | Alert Severity | Time to Budget Exhaustion | Response Time |
|-----------|----------------|---------------------------|---------------|
| 14.4x     | CRITICAL (page)| 2 days                    | Immediate     |
| 6x        | WARNING (ticket)| 5 days                   | Next business day |
| 3x        | INFO (log)     | 10 days                   | Review in retrospective |
| 1x        | Normal         | 30 days (on target)       | No action     |

**4. Reduces Alert Fatigue**

You only page when error budget is genuinely at risk. Small, transient issues that self-resolve don't generate alerts. This leads to:
- Higher signal-to-noise ratio
- More actionable alerts
- Healthier on-call rotation
- Faster incident response (people trust alerts)

**5. Business Alignment**

Error budget provides a shared language between engineering and business:
- **Budget remaining?** Ship faster, take more risks
- **Budget exhausted?** Focus on reliability, slow down releases
- **Consistent budget surplus?** SLO might be too strict, costing engineering time

This creates a **quantitative** framework for reliability vs. velocity trade-offs.

**6. Predictive Early Warning**

Burn rate alerts warn you **before** you exhaust your error budget, giving time to:
- Investigate root causes
- Implement fixes
- Roll back problematic changes
- Prevent SLA violations

**Traditional alert:** "Database is down" (reactive, users already impacted)
**SLO alert:** "Burning error budget 6x faster than target" (predictive, time to respond)

## Common SLO Anti-Patterns to Avoid

**1. Too Many Nines**

Don't default to 99.99% or "five nines" (99.999%) without justification. Each additional nine:
- Costs exponentially more in engineering effort
- Reduces innovation velocity
- May not improve actual user experience

**Ask:** Does going from 99.9% to 99.99% meaningfully improve user experience? For many services, users can't perceive the difference between 99.9% (43 minutes downtime/month) and 99.99% (4.3 minutes/month).

**2. Alerting on SLO Achievement**

Don't alert when you're meeting your SLO. Only alert when error budget is at risk.

**Wrong:** Alert when availability drops below 99.9%
**Right:** Alert when burn rate indicates you'll miss 99.9% over the SLO window

**3. Too Many SLOs**

More SLOs = more cognitive load = less clarity. Start with 1-3 SLOs per user-facing service:
- One availability/success rate SLO
- One latency SLO (optional)
- One saturation SLO (when to scale)

**4. Infrastructure-Based SLOs**

SLOs should measure user experience, not infrastructure health.

**Wrong:** "99% of database queries complete successfully"
**Right:** "99% of user requests complete successfully"

The database might fail queries that get retried transparently. Focus on what users see.

**5. Ignoring Error Budget**

Error budget exists to be spent! If you're consistently at 100% error budget remaining, your SLO is too strict and you're over-investing in reliability.

## Practical Implementation Steps

**1. Choose User-Facing Metrics**

Identify what users actually care about:
- Can they access the service? (Availability)
- Is it fast enough? (Latency)
- Is their data safe? (Durability)

**2. Analyze Historical Performance**

Look at 3-6 months of data:
- What's your current performance?
- What are normal variance ranges?
- What level could you commit to?

New service without historical data?  Start at a 95% goal and choose what means
success.  If the service responds to an HTTP API, start at a latency of 500ms
as the goal.  Then iterate.

**3. Set Initial SLOs Conservatively**

Start with achievable targets:
- If you're at 99.95% historically, start with 99.5% or 99.9%
- Leave headroom for unexpected issues
- You can always tighten later

**4. Define Error Budget**

Error budget = 100% - SLO target over the time window

For 99.9% SLO over 30 days:
- Error budget = 0.1% = 43.2 minutes of allowed downtime
- Burn rate 1x = consuming 1.44 minutes/day
- Burn rate 14.4x = consuming 20.7 minutes/day (critical)

**5. Implement Recording Rules**

Pre-compute SLI measurements at regular intervals (usually 1-5 minutes). This
enables efficient burn rate calculations without expensive queries.  Tools for
generating these recording rules efficiently and consistently is what this
website is about.

**6. Set Up Burn Rate Alerts**

The tools on this website implement multi-window burn rate alerts:
- Fast burn (1h/5m windows): Page immediately
- Slow burn (6h/30m windows): Create ticket for next day

**7. Monitor and Iterate**

SLOs are a **process**, not a project.  The weekly meeting on-call engineers
have to review the last week's alerts and pages is a great time to do this.
Review SLO performance at least quarterly:
- Are you consistently meeting SLOs? (Too easy?)
- Are you consistently missing SLOs? (Too strict?)
- Do alerts correlate with actual user impact?

## Real-World Example

**Scenario:** E-commerce API service

**SLO Definition:**
- **Metric**: HTTP request success rate
- **Target**: 99.9% of requests succeed
- **Window**: 30 days rolling
- **Error budget**: 0.1% = 43.2 minutes of errors per month

**Recording Rules:**
```promql
# 5-minute error ratio
job:api:error_ratio_5m =
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))

# 1-hour error ratio
job:api:error_ratio_1h =
  avg_over_time(job:api:error_ratio_5m[1h])

# 6-hour error ratio
job:api:error_ratio_6h =
  avg_over_time(job:api:error_ratio_5m[6h])

# Error budget remaining
job:api:error_budget_remaining =
  1 - (avg_over_time(job:api:error_ratio_5m[30d]) / 0.001)
```

**Alerts:**
```yaml
# Fast burn: 14.4x burn rate over 1h, confirmed by 5m
- alert: APIErrorBudgetFastBurn
  expr: |
    job:api:error_ratio_1h > 0.00144  # 14.4 * 0.0001
    and
    job:api:error_ratio_5m > 0.00144
  for: 0m
  severity: critical

# Slow burn: 6x burn rate over 6h, confirmed by 30m
- alert: APIErrorBudgetSlowBurn
  expr: |
    job:api:error_ratio_6h > 0.0006   # 6 * 0.0001
    and
    job:api:error_ratio_30m > 0.0006
  for: 0m
  severity: warning
```

**Benefits Realized:**
- Pages reduced by 80% (only 2-3 actionable pages per month)
- All pages correlated with actual user impact
- Team can confidently ship during business hours
- Clear framework for discussing reliability vs. features

## When NOT to Use SLO-Based Alerting

SLO-based alerting may not be appropriate for:

**1. Non-user-facing services** - Internal batch jobs, data pipelines
&rarr; Traditional threshold alerts may be simpler

**2. Hard real-time requirements** - Safety-critical systems, financial trading
&rarr; Need instant detection, can't tolerate burn rate windows

**3. Very low traffic services** - &lt; 100 requests/day
&rarr; Statistical significance issues, hard to measure SLIs accurately

**4. Services without clear user-facing metrics** - Infrastructure components
&rarr; Define SLOs for services that depend on this component instead

## Learn More

The foundational concepts are covered in the Google SRE books:
- [Service Level Objectives (SRE Book Chapter 4)](https://sre.google/sre-book/service-level-objectives/)
- [Implementing SLOs (SRE Workbook Chapter 2)](https://sre.google/workbook/implementing-slos/)
- [Alerting on SLOs (SRE Workbook Chapter 5)](https://sre.google/workbook/alerting-on-slos/)

For a comprehensive practical guide, see Alex Hidalgo's [Implementing Service Level Objectives](https://www.oreilly.com/library/view/implementing-service-level/9781492076803/) (O'Reilly, 2020), which provides detailed strategies for defining, measuring, and alerting on SLOs in real-world environments.

Additional resources:
- [SLOs, SLIs, SLAs, oh my!](https://www.atlassian.com/incident-management/kpis/sla-vs-slo-vs-sli) - Atlassian's beginner-friendly overview

## Ready to Transform Your Monitoring Strategy?

Implementing SLO-based alerting requires deep expertise in Prometheus, observability architecture, and SRE best practices. Cardinality Cloud, LLC specializes in helping teams transition from reactive threshold-based monitoring to proactive, user-centric SLO alerting.

**We can help you:**
- Define meaningful SLOs aligned with business objectives
- Implement multi-window burn rate alerting in Prometheus
- Optimize recording rules for efficient SLI measurement
- Design error budget policies and processes
- Train your team on SRE fundamentals and SLO practices

[Learn more about what we can do for you &rarr;](https://cardinality.cloud)
