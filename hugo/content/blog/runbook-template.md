---
title: "Runbook Template"
date: 2025-10-30
author: "Cardinality Cloud"
tags: ["runbook", "alerting", "prometheus", "operations", "sre", "incident-response", "troubleshooting", "on-call", "mttr", "remediation", "monitoring", "devops", "pagerduty"]
description: "A comprehensive template for developing runbooks which prescribe potential remediations for specific alerts. Reduce MTTR and improve incident response with structured troubleshooting, verification steps, and escalation paths for SRE and DevOps teams."
---

Every alert should have a Runbook.  (Sometimes called Playbook.)  A Runbook is
a guide for SREs, DevOps, On-Call engineers, and Software Developers that
prescribes potential remediations for specific alerts. The goal is to
reduce MTTR and improve incident response with structured troubleshooting,
verification steps, and escalation paths for SRE and DevOps teams.  A place to
build and share knowledge about a potential event.

## Reference Them In Your Alerts

I would not approve a pull request for a new alert without a Runbook.  For
Prometheus alerts, I required that the `runbook_url` annotation be present in
the alert definition YAML and that it point at the URL of the Runbook.  You'll
note how this annotation is suggested in the [Prometheus SLO Alert Rule
Generator](/) on this site.

Here's an example:

```promql
- alert: OpenSearchLowDiskSpace
  expr: (aws_es_free_storage_space_minimum / 1024) < 100
  for: 5m
  labels:
    severity: critical
    team: ...
  annotations:
    summary: Low disk space on OpenSearch data nodes
    description: One or more OpenSearch nodes have less than 100GB free disk space. Immediate action required to avoid failures. Current utilization: {{ $value }}
    runbook_url: https://...
    dashboard_url: https://...
```

The idea being if this alert fires the on-call engineer is immediately handed
this Runbook to review without any additional steps, searching, or prompting.

## Challenges

To build a Runbook practice you need to agree on a common format and require
this.  But engineers won't write these in any common format or even with
relevant information unless they can use an example template with clear
instructions.  Almost copy & paste, but reviewed by SRE.

The other challenge is avoiding the "wall of text" effect, where you see a
giant document and just glaze over.  The process to create a Runbook needs to
be short and succinct--and the Runbooks created also need to be short and
succinct.  This is not the documentation for how you run and implement
OpenSearch from top to bottom.  Rather, these are the commands needed to handle disk
space issues, how to verify, and who can help.

## Solution

[There](https://github.com/SkeltonThatcher/run-book-template)
[are](https://www.pagerduty.com/resources/automation/learn/what-is-a-runbook/)
[many](https://emmer.dev/blog/an-effective-incident-runbook-template/)
[Runbook](https://www.nobl9.com/it-incident-management/runbook-example)
[templates](https://rootly.com/incident-response/runbooks)
[available](https://gitlab.com/gitlab-com/runbooks).
I created this after much research and refined it over a few years with my
friend Phillip Pacheco. This template was used by globally diverse teams in a
large corporate setting to train and share information and successfully lower
MTTR. The instructions are built in, and it produces short, readable Runbooks.
Exactly what you want to see after you've been paged.

I also required that all Runbooks be in the company wiki.  Confluence will do
just fine, but extra points for a Markdown document in a webpage template
system (like [Hugo](https://gohugo.io/)) where the site can be easily copied,
and accessed offline if its support infrastructure is down.  Oh yeah, and
version it.

**Importantly**, these are living documents.  As incidents happen, update them
with newly learned techniques!  Make notes of questions that should be
answered or documented later.  Review these as your service matures.  Don't be
afraid to edit and leave notes for the on-call review weekly meeting.

## Runbook Template

{{< infobox icon="info-circle" title="*Template Instructions*" >}}
* *Copy this page (Confluence menu in the upper right) to create a new Runbook
  and fill in the below template.*
* *Set the Title to a name matching the alert this Runbook covers or the
  application name this Runbook covers alerts for.*
* *Be sure the new Runbook wiki page has the label `runbook.` See the
  Confluence menu for the new wiki page and select "Add Label."*
* *Optional: Add labels to reflect your team or service. This helps build
  automated lists of Runbooks for your team.*
* *Link this Runbook in all relevant Pagerduty notifications for quick
  reference.*
* *Remove all italicized instructions after completing the template.*
{{< /infobox >}}

### Overview

*Address the following:*

- *What does this alert mean?*
- *Is it a paging or a low priority alert?*
- *What factors contribute to the alert?*
- *What parts of the service are affected? Who owns this alert?*
- *List all alerts this Runbook covers using the exact alert name string to
  allow for searching on alert names.*

Owner: *Insert Team Here*

### Alert Severity and Impact

*Indicate the reason for the severity of the alert and the impact of the
alerted condition on the system or service. What symptoms are expected?
Clarify the role of the impacted service and provide KPIs, SLOs or SLAs
affected by this alert.*

### Verification

*Provide specific steps to verify that the condition is ongoing / has been
successfully been remediated.*

### Troubleshooting and Dashboards

*List dashboards that show the health of the service. List log queries or URLs
to find relevant logs for this service or issue.*

*List and describe debugging techniques and related information sources. What
other alerts accompany this alert? Include low urgency alerts that might warn
of this condition appearing. Address the following:*

- *What shows up in the logs when this alert fires?*
- *What debug handlers are available?*
- *What are some useful scripts or commands? What sort of output do they generate?*
- *What are some additional tasks that need to be done after the alert is resolved?*

### Remediation options

*List and describe possible solutions for addressing this alert. These
remediation solutions should be a concise description. It is ok to extrapolate
from external resources, but not to simply provide a link to an external web
page. Your service may be relatively new, and you haven't yet developed
effective remedies yet. If that is the case, then you still need a runbook.
Just be prepared for more escalations.*

*Your suggested remedies should address the following:*

- *How do I fix the problem and stop this alert?*
- *What commands should be run to reset things?*
- *Who should be contacted if this alert happened due to user behavior?*

### Escalation and SMEs

*List and describe paths of escalation. Identify whom to notify (person or
team) and when. If there is no need to escalate, indicate that.*

*For critical in-line services, we strongly encourage you to develop an on-call
rotation for select members of your team to be available 24x7 via PagerDuty.*

### Related Links and Notes

*Provide links to relevant documentation, procedures, and other Runbooks. This
is also a place for generic notes to address this issue. Questions or new
debugging steps should be added here that arise when solving these issues.*
