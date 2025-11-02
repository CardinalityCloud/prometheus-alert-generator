---
title: "Why is burn rate alerting useful?"
date: 2025-10-18
author: "Cardinality Cloud"
tags: ["faq", "slo", "burn-rate", "alerting"]
description: "Understand how burn rate alerting provides early warnings and reduces alert fatigue."
---

Traditional threshold alerts fire on every spike, creating alert fatigue. Burn rate alerting is different - it tracks how quickly you're consuming your error budget and only alerts when errors are sustained enough to threaten your reliability target. This gives you early warnings before user experience degrades, while dramatically reducing noise.

<!--more-->

## Early Warning System

Burn rate alerts notify you when errors are occurring at a rate that will exhaust your error budget before the SLO window ends. For example, if you're burning through error budget at 14.4x the normal rate (fast burn), you'll exhaust a 30-day budget in just ~2 days. This gives you time to respond before user experience is significantly impacted.

## Adaptive Severity Levels

This tool generates two types of burn rate alerts:

- **Fast Burn (Critical)**: 14.4x error budget consumption over 1 hour window, 2 minute alert delay - indicates severe issues requiring immediate attention
- **Slow Burn (Warning)**: 6x error budget consumption over 6 hour window, 15 minute alert delay - indicates sustained degradation requiring investigation

Multi-window detection reduces false positives by requiring the burn rate to persist across different time scales.

## Avoids Alert Fatigue

Traditional threshold alerts fire on every brief spike, even if they don't meaningfully impact your SLO. Burn rate alerts only fire when the error rate is high enough and sustained enough to actually threaten your reliability target. This dramatically reduces noise while ensuring you're alerted to real issues.

## Context for Response

When a burn rate alert fires, you immediately know:
- How quickly you're consuming error budget
- How long until exhaustion at the current rate
- The appropriate urgency level based on severity

This helps teams prioritize incident response appropriately - not every issue requires waking someone up at 3 AM, but burning through 2 days of error budget in 2 hours certainly does.
