---
title: "The Pages That Wouldn't Stop (And Why Faster Response Wasn't the Answer)"
date: 2026-03-17
author: "Cardinality Cloud"
tags: ["sre", "on-call", "alerting", "toil", "prometheus"]
description: "Alert fatigue is often a prioritization problem in disguise. Learn how separating reactive and remediation toil reveals where your SRE team's time actually goes, and how to fix it."
---

We kept getting paged for latency.

The SRE team knew the drill. Shift load to replicas, scale the database, bounce connections. It worked, usually. Things settled down. The on-call engineer closed the incident and went back to sleep.

Then the same page fired three nights later.

<!--more-->

When we started doing formal On-Call Reviews with this team, we pulled every one of these incidents into the room and looked at them together. Same symptoms, same mitigations, slight variations in timing. But when we traced each one back far enough, they all pointed at the same thing: **bad SQL code.**

The actual fix was not a database knob. It was code commits, application deployments, and three different teams working in sync: the SRE team, the data platform team, and the engineers who owned the feature. That coordination had never happened because everyone was overbooked, priorities were scattered, and nobody had the organizational cover to push it through.

When leadership stepped in and made it a priority, the whole class of incidents went away. Engineers came out of it with better SQL skills. Customer support tickets visibly dropped. The on-call rotation got quieter.

That is the thing about alert fatigue: a lot of it is not an alerting problem. It is a prioritization problem wearing an alerting costume.

## Why Tracking Alerts Is Not Enough

If you are using Prometheus and you are serious about reliability, you are probably already thinking carefully about your alert configuration: signal vs. noise, actionability, routing. That is the right instinct.

But there is a layer above the alerts that most teams do not measure. Where is the time actually going?

Toil is not one number. It is two distinct categories, and conflating them is why most teams stay stuck.

*Reactive Capacity:* You got paged. You are working an incident right now. You cannot plan for this work, but you must absorb it.

*Remediation Capacity:* You are doing the work that makes the next incident less likely. Alert tuning, runbook creation, tech debt paydown, root cause fixes. This can be planned and scheduled. This is what makes the pager quieter over time.

Both of these are toil. Project work is the third category and separate from both. It is where you want the majority of SRE time to go.

## The Trap

Every team wants to reduce Reactive load. Almost no team protects time for Remediation.

Here is why: Remediation time feels optional when you are drowning in incidents. There is always something more urgent. The tech debt item gets pushed to next sprint, then the sprint after that.

But the only way to reduce Reactive load is to invest in Remediation first. The improvement does not come before the investment, it comes because of it. You have to protect that time while you are still taking pages at 2am, not after things settle down.

This is where leadership has to step in. Practitioners can identify the work. They usually cannot protect the time for it unilaterally, especially when it requires coordination with other teams.

## A Number Worth Tracking

You probably already know the Google SRE recommendation: keep toil under 50% of your team's time. What it does not tell you is how to actually use that number.

The goal is to keep toil, Reactive and Remediation combined, at **50% or less**. That number is a health indicator, not just a budget.

Teams over 50% have too much tech debt and too many reliability issues to scale. They are losing ground. If improving your alert configuration is not moving that number, it is not enough on its own. You need to track the split from your pager data and your ticket system and make the cost visible to the people who control prioritization.

Teams under 50% are usually operating well and in good shape. Prometheus gives you excellent signal on what is firing and how often. The On-Call Review practice gives you a structured way to turn that signal into organizational action. That is the loop that actually closes.

If you can't measure the split, you can't shift it.

---

## This Is a Chapter in a Book I'm Writing

*The SRE On-Call Review Practice* is a hands-on guide for SRE and DevOps practitioners and the leaders who support them. It covers the full arc: getting the first meeting on the calendar, building the weekly statistics practice, surfacing technical debt, and creating the organizational conditions where the improvements actually get made.

The framework above is part of a broader chapter on organizational commitment and time capacity planning. There is a lot more where this came from.

**[Grab the preview and get early access when the book ships.](https://store.cardinality.cloud/checkout/buy/228cdb04-bb12-4faf-b089-d43048658fb1)**

Preview readers get first access to the finished book. Feedback welcome. Real input from practitioners who have lived these problems is exactly what makes a book like this worth reading.
