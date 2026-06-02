---
title: "I Wrote a Book About the Thing That Almost Broke Me"
date: 2026-06-02
author: "Cardinality Cloud"
tags: ["sre", "on-call", "alerting", "alert-fatigue", "book"]
description: "The SRE On-Call Review Practice is the first book in the Observability Practitioner Series. Here is the story behind it."
image: "blog/book-1-kdp-cover.jpg"
canonical: "https://cardinality.cloud/blog/sre-on-call-book/"
---

<img src="/blog/book-1-kdp-cover.jpg" alt="The SRE On-Call Review Practice book cover" class="d-block mx-auto mb-4 img-fluid" style="max-width: 340px;">

I remember the knock on the door.

I don't know what I was doing. Probably something that felt urgent. What I know
is that when someone knocked on the door of my office -- a shed in the back
yard -- I started screaming. It was another interruption from another
direction, and every neuron in my body had been trained to respond to
interruption with panic.

I scared my friend. I scared myself. That's when I knew I needed a therapist.

<!--more-->

I've been in this industry for 25 years. I've watched teams get paged into the
ground, usually without anyone naming what was happening to them. Nobody had
written the book I kept wishing existed. So I wrote it.

Every alert that fires during an on-call shift has exactly three valid
responses. Only three.

**Action it.** It's a real event. Acknowledge, assess impact, remediate, update
the runbook.

**Fix the alert rule.** It's not a real event, or the thresholds are wrong.
The problem is in your alerting config, not in production.

**Escalate.** It belongs to another team. Route it correctly, then update the
routing so it doesn't come back to you.

The discipline is in actually choosing one, every time, without letting alerts
pile up in a state where their meaning gets lost. This sounds simple. It is not
easy. The book is about building the practice that makes it sustainable.

*The SRE On-Call Review Practice* is the first book in the Observability
Practitioner Series from Cardinality Cloud.

[Read the full story and get your copy {{< icon "arrow-right" 16 "icon-sm" >}}](https://cardinality.cloud/observability-practitioner-series/)
