---
title: "What is an SLO and why should I use SLO-based alerts?"
date: 2025-01-20
author: "Cardinality Cloud"
tags: ["faq", "slo", "alerting", "fundamentals"]
description: "Learn what SLOs are and why SLO-based alerting is superior to traditional threshold-based alerting."
---

An SLO (Service Level Objective) is a target reliability goal for your service, expressed as a percentage (e.g., 99.9% uptime). SLOs define the level of reliability your users can expect and help you balance reliability with development velocity.

SLO-based alerting has several advantages over traditional threshold-based alerting:

- **User-centric**: Focuses on user-facing reliability rather than arbitrary infrastructure thresholds
- **Context-aware**: Uses multi-window burn rate detection to alert on issues at the right time and severity
- **Reduces noise**: Only alerts when error budget is meaningfully at risk, dramatically reducing alert fatigue
- **Business alignment**: Helps balance reliability investments with feature development velocity
- **Early warning system**: Detects problems before you exhaust your error budget

## Learn More

The foundational concepts are covered in the Google SRE books:
- [Service Level Objectives (SRE Book Chapter 4)](https://sre.google/sre-book/service-level-objectives/)
- [Implementing SLOs (SRE Workbook Chapter 2)](https://sre.google/workbook/implementing-slos/)
- [Alerting on SLOs (SRE Workbook Chapter 5)](https://sre.google/workbook/alerting-on-slos/)

For a comprehensive practical guide, see Alex Hidalgo's [Implementing Service Level Objectives](https://www.oreilly.com/library/view/implementing-service-level/9781492076803/) (O'Reilly, 2020), which provides detailed strategies for defining, measuring, and alerting on SLOs in real-world environments.
