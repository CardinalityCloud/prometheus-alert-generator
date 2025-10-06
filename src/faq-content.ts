export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  icon?: 'github' | 'bug' | 'mail' | 'help';
}

export const faqItems: FaqItem[] = [
  {
    id: 'what-is-slo',
    question: 'What is an SLO and why should I use SLO-based alerts?',
    icon: 'help',
    answer: `An SLO (Service Level Objective) is a target reliability goal for your service, expressed as a percentage (e.g., 99.9% uptime). SLOs define the level of reliability your users can expect and help you balance reliability with development velocity.

SLO-based alerting has several advantages over traditional threshold-based alerting:

- **User-centric**: Focuses on user-facing reliability rather than arbitrary infrastructure thresholds
- **Context-aware**: Uses multi-window burn rate detection to alert on issues at the right time and severity
- **Reduces noise**: Only alerts when error budget is meaningfully at risk, dramatically reducing alert fatigue
- **Business alignment**: Helps balance reliability investments with feature development velocity
- **Early warning system**: Detects problems before you exhaust your error budget

**Learn More:**

The foundational concepts are covered in the Google SRE books:
- [Service Level Objectives (SRE Book Chapter 4)](https://sre.google/sre-book/service-level-objectives/)
- [Implementing SLOs (SRE Workbook Chapter 2)](https://sre.google/workbook/implementing-slos/)
- [Alerting on SLOs (SRE Workbook Chapter 5)](https://sre.google/workbook/alerting-on-slos/)

For a comprehensive practical guide, see Alex Hidalgo's [Implementing Service Level Objectives](https://www.oreilly.com/library/view/implementing-service-level/9781492076803/) (O'Reilly, 2020), which provides detailed strategies for defining, measuring, and alerting on SLOs in real-world environments.`,
  },
  {
    id: 'why-burn-rate',
    question: 'Why is burn rate alerting useful?',
    icon: 'help',
    answer: `Burn rate alerting is a sophisticated approach to SLO monitoring that tracks how quickly you're consuming your error budget, rather than just alerting when you've already exhausted it. This provides several critical advantages:

**Early Warning System**

Burn rate alerts notify you when errors are occurring at a rate that will exhaust your error budget before the SLO window ends. For example, if you're burning through error budget at 14.4x the normal rate (fast burn), you'll exhaust a 30-day budget in just ~2 days. This gives you time to respond before user experience is significantly impacted.

**Adaptive Severity Levels**

This tool generates two types of burn rate alerts:

- **Fast Burn (Critical)**: 14.4x error budget consumption over 1 hour window, 2 minute alert delay - indicates severe issues requiring immediate attention
- **Slow Burn (Warning)**: 6x error budget consumption over 6 hour window, 15 minute alert delay - indicates sustained degradation requiring investigation

Multi-window detection reduces false positives by requiring the burn rate to persist across different time scales.

**Avoids Alert Fatigue**

Traditional threshold alerts fire on every brief spike, even if they don't meaningfully impact your SLO. Burn rate alerts only fire when the error rate is high enough and sustained enough to actually threaten your reliability target. This dramatically reduces noise while ensuring you're alerted to real issues.

**Context for Response**

When a burn rate alert fires, you immediately know:
- How quickly you're consuming error budget
- How long until exhaustion at the current rate
- The appropriate urgency level based on severity

This helps teams prioritize incident response appropriately - not every issue requires waking someone up at 3 AM, but burning through 2 days of error budget in 2 hours certainly does.

**Learn More:**

- [The Art of SLOs (Alex Hidalgo)](https://www.circonus.com/art-slos-folksonomies-part-1/)
- [SLO Alerting for Mortals (Grafana Labs)](https://grafana.com/blog/2021/12/06/slo-alerting-for-mortals/)`,
  },
  {
    id: 'riemann-sum-technique',
    question: 'How does this tool efficiently calculate error budget over long SLO windows?',
    icon: 'help',
    answer: `This tool uses a Riemann Sum-inspired technique to efficiently calculate error budget consumption over long time windows (like 30 days) without requiring expensive range queries over raw counter metrics.

**The Problem**

Calculating error budget remaining over a 30-day window naively would require something like:

\`\`\`promql
1 - (sum_over_time(rate(errors[5m])[30d]) / sum_over_time(rate(total[5m])[30d]))
\`\`\`

This is computationally expensive and can cause Prometheus query timeouts, especially with high cardinality metrics.

**The Riemann Sum Solution**

Instead, this tool generates a recording rule that pre-computes the error ratio at 5-minute intervals:

\`\`\`promql
# Error ratio over 5m window (evaluated every 1m by default)
job:slo_burn:ratio_5m = rate(errors[5m]) / rate(total[5m])
\`\`\`

Then, to calculate error budget remaining over the full 30-day window, we use:

\`\`\`promql
1 - (avg_over_time(job:slo_burn:ratio_5m[30d]) / error_budget)
\`\`\`

**Why This Works: The Math**

This technique is inspired by Riemann Sums from calculus. The error budget consumed over a time period is:

∫₀ᵀ error_rate(t) dt / ∫₀ᵀ total_rate(t) dt

By sampling the error ratio at regular intervals (every evaluation, typically 1m), we're approximating this integral as:

(1/n) × Σᵢ₌₁ⁿ (error_rate(tᵢ) / total_rate(tᵢ))

This is exactly what \`avg_over_time(job:slo_burn:ratio_5m[30d])\` computes - it takes the average of all 5-minute error ratio samples over the 30-day window. The 5-minute window smooths out instantaneous spikes while the evaluation interval (1m) ensures we sample frequently enough to capture meaningful changes.

**Key Advantages**

- **Performance**: Queries only pre-computed recording rule samples, not raw metrics
- **Accuracy**: With 1-minute evaluation intervals, we get ~43,200 samples over 30 days, providing high accuracy
- **Scalability**: Query cost is constant regardless of request rate or metric cardinality
- **Simplicity**: Single \`avg_over_time()\` function instead of complex nested aggregations

**The Trade-off**

The accuracy depends on:
- Evaluation interval (shorter = more samples = more accurate)
- Recording rule window (5m provides good balance between smoothing and responsiveness)

With the default 1-minute evaluation interval, the approximation error is negligible for practical SLO monitoring.

**Historical Context**

This approach is similar to how Prometheus's \`recording rules\` were designed - pre-compute expensive aggregations and then query the results. The connection to Riemann Sums makes the mathematical foundation clear: we're numerically integrating the error rate over time using the midpoint rule with small step sizes.`,
  },
  {
    id: 'querying-rules',
    question: 'How do I query these generated rules in Prometheus to monitor my application?',
    icon: 'help',
    answer: `Once you've loaded the generated rules into Prometheus, you can query the recording rules directly to monitor your application's health and SLO compliance. Here are the most useful queries:

**Check Current SLO Status**

See if your service is currently meeting its SLO target:

\`\`\`promql
# Success rate over the last 5 minutes
job:slo:ratio_rate5m{job="my-app"}

# Compare to your SLO goal
job:slo:ratio_rate5m{job="my-app"} >= job:slo_goal:ratio{job="my-app"}
\`\`\`

A value of \`1\` (true) means you're meeting your SLO, \`0\` (false) means you're currently below target.

**Error Budget Remaining**

Check how much error budget you have left:

\`\`\`promql
# Remaining error budget as a percentage
job:error_budget:remaining_ratio_30d{job="my-app"} * 100
\`\`\`

Positive values indicate remaining budget. Values near 0 or negative mean you're at risk of or have breached your SLO.

**Current Burn Rate**

See how fast you're consuming error budget right now:

\`\`\`promql
# Fast burn rate (1h window) - Critical if > 14.4x error budget
job:slo_burn:ratio_1h{job="my-app"} / (1 - (job:slo_goal:ratio{job="my-app"}))

# Slow burn rate (6h window) - Warning if > 6x error budget
job:slo_burn:ratio_6h{job="my-app"} / (1 - (job:slo_goal:ratio{job="my-app"}))
\`\`\`

A value of \`1.0\` means you're burning at exactly the rate your error budget allows. Values > 1.0 mean you're consuming budget faster than sustainable.

**Active Liveness**

Check how many instances are currently up:

\`\`\`promql
# Percentage of instances that are up
avg(up{job="my-app"}) * 100
\`\`\`

**Visualize Trends**

For dashboards, these queries show trends over time:

\`\`\`promql
# SLO compliance over the last 24 hours (shows minimum in 5m intervals)
min_over_time(job:slo:ratio_rate5m{job="my-app"}[24h:5m])

# Error budget trend - see how it changes over time
job:error_budget:remaining_ratio_30d{job="my-app"}

# Error rate spike detection - show max error rate in 1h windows
max_over_time(job:slo_burn:ratio_5m{job="my-app"}[1h])
\`\`\`

Replace \`my-app\` with your actual application name, and adjust the \`slo_type\` label if you're tracking multiple SLO types for the same service.`,
  },
  {
    id: 'contribute',
    question: 'How do I contribute to this project?',
    icon: 'github',
    answer: `We welcome contributions! This project is open source under the Apache 2.0 license.

To contribute:

- Fork the repository at [GitHub](https://github.com/CardinalityCloud/prometheus-alert-generator)
- Read our [Contributing Guidelines](https://github.com/CardinalityCloud/prometheus-alert-generator/blob/main/CONTRIBUTING.md)
- Create a feature branch
- Make your changes and write tests if applicable
- Submit a pull request`,
  },
  {
    id: 'issues',
    question: 'How do I report a bug or request a feature?',
    icon: 'bug',
    answer: `We use GitHub Issues to track bugs and feature requests.

To report a bug or request a feature:

- Visit our [Issues page](https://github.com/CardinalityCloud/prometheus-alert-generator/issues)
- Search existing issues to avoid duplicates
- Click "New Issue" and provide detailed information
- For bugs: include steps to reproduce, expected vs actual behavior
- For features: describe the use case and desired functionality`,
  },
  {
    id: 'contact',
    question: 'How do I contact Cardinality Cloud?',
    icon: 'mail',
    answer: `You can reach Cardinality Cloud through multiple channels:

- Email: [jjneely@cardinality.cloud](mailto:jjneely@cardinality.cloud)
- Website: [cardinality.cloud](https://cardinality.cloud/)
- For general feedback about this tool, use the feedback email above

We'd love to hear your thoughts on how we can improve this tool!`,
  },
];
