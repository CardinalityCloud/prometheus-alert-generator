---
title: "What is an Error Budget?"
date: 2025-10-10
author: "Cardinality Cloud"
tags: ["faq", "slo", "error-budget"]
description: "Understanding error budgets and how they help balance reliability and innovation."
---

Engineering wants to slow down and fix stability issues. Product wants to ship faster and hit deadlines. Who's right? Both - and neither. The real question isn't "should we prioritize reliability or velocity?" but "how much unreliability can we tolerate while still meeting our promises?" That's your error budget: the quantitative answer that turns endless debates into data-driven decisions. With a 99.9% SLO, you get 43.2 minutes of downtime per month to spend on innovation, experiments, or controlled risks.

<!--more-->

## The Math

If your SLO is 99.9% availability over 30 days:

- **Target uptime**: 99.9% = 43,156 minutes
- **Allowed downtime**: 0.1% = 43.2 minutes per month
- **Error budget**: Those 43.2 minutes

## Why Error Budgets Matter

Error budgets create a shared language between engineering and product teams:

- **100% reliability is impossible** (and wasteful to pursue)
- **Error budget = innovation budget**: Spend it on new features, experiments, or controlled risks
- **When budget is low**: Focus on stability and reliability improvements
- **When budget is healthy**: Ship faster and take calculated risks

## Burn Rate

**Burn rate** measures how quickly you're consuming your error budget:

- **Burn rate 1.0**: On track to exactly meet SLO
- **Burn rate 2.0**: Consuming budget 2x faster than planned
- **Burn rate 14.4**: Will exhaust monthly budget in ~2 days

## Practical Example

With a 99.9% SLO (30-day window):

```
Error budget: 43.2 minutes/month

If experiencing 1% error rate:
- Normal rate: 0.1% (meeting SLO)
- Current rate: 1.0%
- Burn rate: 10x
- Time to exhaustion: ~3 days
```

This is why we alert on burn rate, not absolute error rates!

## Using the Alert Generator

Our [Alert Generator](/) automatically creates alerts based on burn rate thresholds:

1. Enter your SLO target
2. Provide success/error metrics
3. Get multi-window burn rate alerts

These alerts fire when you're consuming error budget too quickly, giving you time to respond before your SLO is breached.

## Related Articles

- [Understanding SLO-Based Alerting](/blog/understanding-slo-based-alerting/)
- [How to Choose SLO Targets](/faq/) (coming soon)
