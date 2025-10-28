---
title: "Simplifying SLOs: Combining Multiple Metrics Into Weighted Aggregate Health Scores"
summary: "Learn how to reduce alert fatigue and build strategic SLOs by combining multiple KPIs into a single weighted health score. A practical approach to measuring service reliability."
date: 2025-10-23
draft: false
categories: ["o11y"]
tags: ["slo", "sli", "observability", "monitoring", "sre", "metrics", "kpi"]
images: ["weighted-health-preview.png"]
---

## The Problem: Too Many Metrics, Not Enough Clarity

If you've worked with SLOs (Service Level Objectives) in production systems, you've likely faced this challenge: **how do you distill dozens or hundreds of metrics into a meaningful measure of service health?**

Common symptoms include:
- **Alert fatigue** from monitoring every individual metric
- **Difficulty explaining** service health to stakeholders
- **Strategic confusion** about which SLOs actually matter
- **Over-complicated dashboards** that obscure rather than illuminate

You know your service has multiple dimensions of health—latency, error rates, throughput, resource utilization—but monitoring each separately creates noise. What you really need is a **single, composite health score** that captures overall service reliability.

## The Solution: Weighted Aggregate Health Scores

The approach I've used successfully across multiple organizations is deceptively simple: **express each KPI as a ratio of success, assign it a weight based on business impact, and combine them into a single aggregate score.**

Here's the formula:

```
Aggregate Health = (W₁ × KPI₁) + (W₂ × KPI₂) + (W₃ × KPI₃) + ...
```

Where:
- **Each KPI** is expressed as a ratio between 0 and 1 (success/total)
- **Each weight (W)** represents the relative importance of that KPI
- **All weights sum to 1** (e.g., 0.4 + 0.3 + 0.2 + 0.1 = 1.0)

The result is a single number between 0 and 1 that represents overall service health. You can then set SLO targets on this aggregate score (e.g., "maintain ≥ 0.99 aggregate health over 28 days").

## Why This Works

### 1. **Reflects Business Reality**

Not all metrics are equally important. A slight increase in latency might be tolerable, but any increase in payment processing errors is critical. Weights let you encode these business priorities mathematically.

### 2. **Reduces Alert Noise**

Instead of alerting on every individual metric threshold, you alert when the aggregate score drops below your SLO. This dramatically reduces false positives while catching real problems.

### 3. **Enables Strategic SLOs**

Rather than maintaining 50+ SLOs per service, you can collapse them into 2-5 strategic aggregate SLOs that stakeholders can actually understand and track.

### 4. **Simplifies Communication**

"Our service is at 99.7% health this month" is far easier to discuss in reviews than "Latency P95 is at 180ms, error rate is 0.3%, and throughput is..."

## Practical Example: E-Commerce Checkout Service

Let's design an aggregate health score for a checkout service with multiple quality signals:

### Step 1: Identify Key Performance Indicators

- **Request Success Rate**: Successful checkouts / total checkout attempts
- **Latency Compliance**: Requests under 500ms / total requests
- **Payment Processing**: Successful payments / total payment attempts
- **Inventory Accuracy**: Correct inventory checks / total checks

### Step 2: Assign Weights Based on Business Impact

```
Payment Processing:      40% (0.40) - Most critical, directly affects revenue
Request Success Rate:    30% (0.30) - Core functionality
Latency Compliance:      20% (0.20) - User experience impact
Inventory Accuracy:      10% (0.10) - Important but less immediate impact
```

### Step 3: Calculate the Aggregate Score

On a given day:
- Payment Processing: 0.998 (99.8% success)
- Request Success Rate: 0.995 (99.5% success)
- Latency Compliance: 0.970 (97.0% under 500ms)
- Inventory Accuracy: 0.999 (99.9% accurate)

```
Aggregate Health = (0.40 × 0.998) + (0.30 × 0.995) + (0.20 × 0.970) + (0.10 × 0.999)
                 = 0.3992 + 0.2985 + 0.1940 + 0.0999
                 = 0.9916 (99.16%)
```

If your SLO target is 99.0%, you're meeting it. If latency degrades further, you'll see it reflected in the aggregate score before users churn.

## Implementation in Prometheus

Here's how to implement this as Prometheus recording rules:

```yaml
groups:
  - name: checkout_service_health
    interval: 30s
    rules:
      # Individual KPI ratios
      - record: checkout:payment_success_ratio:5m
        expr: |
          sum(rate(payments_total{service="checkout",status="success"}[5m]))
          /
          sum(rate(payments_total{service="checkout"}[5m]))

      - record: checkout:request_success_ratio:5m
        expr: |
          sum(rate(requests_total{service="checkout",status=~"2.."}[5m]))
          /
          sum(rate(requests_total{service="checkout"}[5m]))

      - record: checkout:latency_compliance_ratio:5m
        expr: |
          sum(rate(request_duration_bucket{service="checkout",le="0.5"}[5m]))
          /
          sum(rate(request_duration_count{service="checkout"}[5m]))

      - record: checkout:inventory_accuracy_ratio:5m
        expr: |
          sum(rate(inventory_checks_total{service="checkout",status="accurate"}[5m]))
          /
          sum(rate(inventory_checks_total{service="checkout"}[5m]))

      # Weighted aggregate health score
      - record: checkout:aggregate_health:5m
        expr: |
          (0.40 * checkout:payment_success_ratio:5m)
          + (0.30 * checkout:request_success_ratio:5m)
          + (0.20 * checkout:latency_compliance_ratio:5m)
          + (0.10 * checkout:inventory_accuracy_ratio:5m)
```

You can then create an alert when the aggregate health drops below your SLO target:

```yaml
groups:
  - name: checkout_service_alerts
    rules:
      - alert: CheckoutServiceHealthLow
        expr: checkout:aggregate_health:5m < 0.990
        for: 5m
        labels:
          severity: warning
          service: checkout
        annotations:
          summary: "Checkout service aggregate health below SLO"
          description: "Aggregate health score is {{ $value | humanizePercentage }}, below 99.0% target"
```

## Implementation Considerations

### Choosing Weights

**Don't overthink this.** If you're unsure where to start, use equal weights for all your KPIs. For four metrics, that's 0.25 each. For three metrics, 0.33 each. This eliminates analysis paralysis and gets you to a working system quickly.

Once you have equal weights deployed and data flowing, you can iterate based on real observations:
- Which KPI degradations actually correlate with customer complaints?
- Which metrics show the most volatility?
- Which failures cause the most business impact?

The goal isn't to pick perfect "magic numbers" from the start—it's to create a framework you can refine over time.

When you're ready to move beyond equal weights, selection should be driven by:
1. **Business impact**: What causes customer churn or revenue loss?
2. **User experience**: What do users notice first?
3. **Historical incidents**: Review past outages—which metrics would have signaled problems earliest?
4. **Team consensus**: Get buy-in from product, engineering, and business stakeholders
5. **Iteration**: Continuously adjust based on incident retrospectives and operational experience

### Time Windows and SLO-Style Alerting

Use consistent time windows across all KPIs for calculating the individual ratios. The most common pattern is **5-minute rate windows** (`rate(...[5m])`) which provide a good balance between responsiveness and noise reduction.

However, the real power of aggregate health scores emerges when you combine them with **traditional SLO-style alerting** using multi-window burn rate detection. Your aggregate health score becomes a single, high-quality SLI (Service Level Indicator) that can feed directly into standard SLO frameworks.

#### From Aggregate Health to SLO Compliance

Once you have a recording rule producing your aggregate health score, you can track it over longer windows:

- **30-day windows** for standard SLO compliance reporting
- **7-day windows** for shorter-cycle services or more aggressive targets
- **90-day windows** for ultra-high-reliability services

The aggregate health score essentially becomes your **"good events / total events"** ratio. For example:
- Aggregate health of 0.999 = 99.9% of weighted service capabilities are functioning correctly
- This can be treated as your SLO target: "maintain ≥99.5% aggregate health over 30 days"

#### Example: Using the Prometheus Alert Generator

We've built a free tool specifically designed to make SLO alerting effortless: the [Prometheus Alert Generator](https://prometheus-alert-generator.com/). It generates multi-window burn rate alerts and error budget tracking—and it works perfectly with aggregate health scores.

Here's how to use your aggregate health score with the generator:

**Step 1**: Create your aggregate health recording rule (as shown in the Implementation section above)

**Step 2**: The generator expects **errors** (bad events) over **total** events. Since your aggregate health is already a ratio where 1.0 = perfect health, you can use a simple, powerful approach—directly enter the expressions into the generator:

- **Error Metric**: `(1 - checkout:aggregate_health:5m)` — The "unhealthy" portion
- **Total Metric**: `vector(1)` — Normalized to 1 since aggregate health is already a ratio

**Step 3**: Input these into the [Prometheus Alert Generator](https://prometheus-alert-generator.com/):

- **Application Name**: `checkout`
- **Error Metric**: `(1 - checkout:aggregate_health:5m)`
- **Total Metric**: `vector(1)`
- **SLO Target**: `99.5%` (or whatever your business requires)
- **Error Budget Window**: `30 days`

This simple approach works because your aggregate health is already normalized (0 to 1). The generator will calculate the error ratio as `(1 - health) / 1`, which equals your failure rate directly.

The generator will produce multi-window burn rate alerts that fire when your aggregate health degrades at unsustainable rates, plus error budget tracking rules that efficiently calculate compliance over the full 30-day window using the [Riemann Sum technique](https://cardinality.cloud/blog/prometheus_alert_generator/).

This gives you the best of both worlds:
- **Simple aggregate health** collapses multiple KPIs into one strategic metric
- **Battle-tested SLO alerting** catches problems at multiple time scales (fast and slow burns)
- **Error budget visibility** shows exactly how much reliability "budget" you have left

For more details on how the alert generator works and the mathematics behind multi-window burn rate detection, see our [Prometheus Alert Generator announcement](https://cardinality.cloud/blog/prometheus_alert_generator/).

### Handling Missing Data

Missing data is common in production—and often unavoidable. A classic example: **your checkout service has no traffic during off-peak hours**. When there are zero requests, latency measurements return null (division by zero), which breaks your aggregate health calculation.

This happens frequently:
- Low-traffic services during off-peak hours
- Newly deployed services with no load yet
- Regional services outside business hours
- Canary deployments with minimal traffic

**The Solution: Use `or` to Provide Defaults**

Prometheus's `or` operator lets you specify fallback values when metrics are null:

```yaml
groups:
  - name: checkout_service_health
    interval: 30s
    rules:
      # Latency compliance with fallback to 1.0 when no traffic
      - record: checkout:latency_compliance_ratio:5m
        expr: |
          (
            sum(rate(request_duration_bucket{service="checkout",le="0.5"}[5m]))
            /
            sum(rate(request_duration_count{service="checkout"}[5m]))
          )
          or
          vector(1.0)

      # Payment processing with fallback to 1.0 when no payments
      - record: checkout:payment_success_ratio:5m
        expr: |
          (
            sum(rate(payments_total{service="checkout",status="success"}[5m]))
            /
            sum(rate(payments_total{service="checkout"}[5m]))
          )
          or
          vector(1.0)
```

When there's no traffic, `rate(...[5m])` returns empty, division produces null, and the `or vector(1.0)` provides a fallback of 1.0 (perfect health).

**Choosing the Right Default**

The fallback value depends on what absence means for your service:

- **Default to 1.0** (assume perfect health): Use when no traffic is normal and acceptable
  - Off-peak hours for user-facing services
  - Optional background jobs that don't always run
  - Regional services outside their primary timezone

- **Default to 0.0** (assume failure): Use when absence indicates a problem
  - Critical background processors that should always be running
  - Health check endpoints that should always respond
  - Data pipelines that must process continuous streams

**Example: Mixed Defaults**

```yaml
# No traffic during off-peak? That's fine - default to healthy
- record: checkout:request_success_ratio:5m
  expr: |
    (
      sum(rate(requests_total{service="checkout",status=~"2.."}[5m]))
      /
      sum(rate(requests_total{service="checkout"}[5m]))
    )
    or
    vector(1.0)

# Background order processor should ALWAYS be running - absence is failure
- record: checkout:order_processor_health:5m
  expr: |
    (
      sum(rate(orders_processed_total{status="success"}[5m]))
      /
      sum(rate(orders_processed_total[5m]))
    )
    or
    vector(0.0)
```

This ensures your aggregate health score remains calculable even when individual KPIs have no data, while reflecting the correct interpretation of that absence.

### Documentation is Critical

Document your weights and the rationale behind them. When an incident happens and stakeholders ask "why didn't this alert?", you need to explain which factors drove the aggregate score.

## Advanced Patterns

### Separate Customer-Facing vs. Internal Health

Consider two aggregate scores:
- **Customer Health**: Only includes user-visible quality signals (errors, latency)
- **Operational Health**: Includes internal signals (queue depth, database saturation)

Alert on customer health for urgent issues; track operational health for capacity planning.

### Non-Linear Weighting

For some scenarios, you might want non-linear contributions. For example, error rates might have exponential impact where small increases in errors should disproportionately affect the health score.

**Fun fact**: My Calculus Professor in college used exactly this method to make sure **most** of us passed the class. Turns out non-linear transformations aren't just for helping struggling students—they're also useful for making your SLOs reflect reality.

```yaml
groups:
  - name: nonlinear_health_scores
    interval: 30s
    rules:
      # Calculate base error rate
      - record: service:error_rate:5m
        expr: |
          sum(rate(requests_total{status=~"5.."}[5m]))
          /
          sum(rate(requests_total[5m]))

      # Apply non-linear transformation (square root dampening)
      # This makes the impact grow more slowly at first, then accelerate
      - record: service:error_impact_score:5m
        expr: 1.0 - sqrt(service:error_rate:5m)

      # Alternative: Exponential sensitivity (small errors have big impact)
      - record: service:error_impact_exponential:5m
        expr: clamp_min(1.0 - (service:error_rate:5m * 10), 0)
```

The square root transformation (`sqrt()`) makes the aggregate more sensitive to error rate increases—a jump from 1% to 4% errors has a bigger impact than linear weighting would suggest. The exponential version amplifies small error rates even more aggressively.

### Dynamic Weights Based on Traffic

During high-traffic events (Black Friday, product launches), you might temporarily increase latency weight and decrease throughput weight to reflect different priorities.

## Common Pitfalls to Avoid

### 1. **Over-Engineering**

Start simple. Three to five well-chosen KPIs with straightforward weights will serve you better than a complex model with 20 factors.

### 2. **Ignoring Outliers**

Aggregate scores smooth over outliers. Maintain separate high-percentile alerts (P99, P99.9) for catching tail latency issues.

### 3. **Set It and Forget It**

Review your weights quarterly. As your service evolves, so should your health score definition.

### 4. **Hiding Problems**

If one critical KPI is at 50% but others are at 100%, your aggregate might still look acceptable. Consider **minimum thresholds** for critical components.

## Getting Started

Here's a practical roadmap:

1. **Start with one service**: Pick a well-understood service to prototype
2. **Identify 3-5 core KPIs**: Focus on signals you already monitor
3. **Assign initial weights**: Use a simple distribution (0.4, 0.3, 0.2, 0.1)
4. **Implement the calculation**: Add a derived metric to your monitoring system
5. **Backtest against incidents**: Would this have alerted appropriately?
6. **Iterate on weights**: Adjust based on team feedback and incident reviews
7. **Expand to other services**: Apply lessons learned to additional services

## Conclusion

Weighted aggregate health scores transform observability from overwhelming to actionable. By combining multiple KPIs into a single strategic measure, you reduce alert fatigue, improve communication with stakeholders, and focus your team on what actually matters: **is the service healthy enough to meet customer needs?**

The math is simple, but the impact is profound. Instead of drowning in metrics, you gain clarity. Instead of reacting to every fluctuation, you respond to meaningful degradation. Instead of explaining 50 SLOs, you discuss 5.

This approach won't eliminate the need for detailed metrics—you'll still need them for debugging—but it provides the **strategic layer** that turns observability into a competitive advantage.

---

**Need help designing aggregate health scores for your services?** Cardinality
Cloud specializes in SLO strategy, observability architecture, and production
reliability. [Get in touch](https://cardinality.cloud/contact) to discuss how we can help you simplify
and strengthen your monitoring approach.

## Try It Yourself

Use the interactive calculator below to experiment with different KPI values and weights to see how they combine into an aggregate health score:

{{< weighted-health-calculator >}}
