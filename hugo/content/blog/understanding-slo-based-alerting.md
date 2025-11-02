---
title: "Understanding SLO-Based Alerting"
date: 2025-10-15
author: "Cardinality Cloud"
tags: ["slo", "alerting", "prometheus"]
description: "Learn how SLO-based alerting helps you focus on what matters: user-facing reliability issues."
---

Why does a 5% error rate trigger an alert at 2 AM? Is it catastrophic during peak traffic or meaningless during low usage? Traditional static thresholds can't tell you. SLO-based alerting asks a better question: "Are we consuming our error budget faster than planned?" This approach ties alerts directly to user-impacting reliability issues, eliminating arbitrary thresholds and reducing alert fatigue while catching real problems early.

<!--more-->

## What is an SLO?

An SLO is a target reliability level for a service, expressed as a percentage. For example, a 99.9% availability SLO means your service should be available 99.9% of the time over a given period.

## Why SLO-Based Alerting?

Traditional alerting often uses static thresholds like "alert if error rate &gt; 5%". This approach has problems:

- **Context-free**: 5% errors might be fine during low traffic, but catastrophic during peak hours
- **Alert fatigue**: Too many alerts that don't correlate with user impact
- **Arbitrary thresholds**: Why 5%? Why not 4% or 6%?

SLO-based alerting solves these by asking: "Are we consuming our error budget faster than planned?"

## Error Budget and Burn Rate

Your **error budget** is how much failure you can tolerate: `100% - SLO target`. For a 99.9% SLO, you have a 0.1% error budget.

**Burn rate** measures how quickly you're consuming this budget relative to the SLO period. A burn rate of 1.0 means you're on track to exactly meet your SLO. A burn rate of 14.4 means you'll exhaust your entire monthly budget in 2 days!

## Multi-Window, Multi-Burn-Rate Alerts

Our alert generator creates alerts based on Google's SRE workbook recommendations:

- **Fast burn (critical)**: 14.4x burn rate over 1 hour + 1 hour lookback
- **Slow burn (warning)**: 6x burn rate over 6 hours + 6 hour lookback

This approach balances:
- **Precision**: Short windows catch issues quickly
- **Recall**: Longer windows reduce false positives

## Getting Started

Use our [Alert Generator](/app/) to create SLO-based alerting rules for your Prometheus setup. Simply provide:

1. Your SLO target (e.g., 99.9%)
2. Success/failure metrics
3. SLO window (typically 30 days)

The generator creates all necessary recording rules and multi-window alerts ready to use with Prometheus.

## Learn More

- Read the [Google SRE Workbook chapter on SLO alerting](https://sre.google/workbook/alerting-on-slos/)
- Check our [FAQ](/faq/) for common questions
- Try our [Alert Generator](/) now
