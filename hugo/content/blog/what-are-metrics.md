---
title: "What Really Is a Metric?"
date: 2026-02-02
author: "Cardinality Cloud"
tags: ["fundamentals", "metrics", "prometheus", "observability", "tsdb"]
description: "A metric isn't just any number. It's a specific data type with strengths, weaknesses, and trade-offs. Learn how metrics work as pre-computed aggregations, why they're efficient, and when cardinality explosions happen."
---

{{< youtube 73enppl5jSc >}}

A metric is not reality. It's a lossy measurement with assumptions baked in.

I said it. I'll own it. But when we talk about observability, what really is a metric?

<!--more-->

Most people get this wrong. They think a metric is any numerical measurement, any number you can pull out of your system. That's not correct.

In observability, a metric refers to a **specific data type**. Just like arrays, linked lists, binary trees, and hash tables are all specific data types in computer science, each with their own strengths and weaknesses.

Metrics are pre-computed summaries or aggregations sampled over time. Usually every 15 seconds, 30 seconds, or 60 seconds. Not raw events. Which means they're lossy.

## How Metrics Actually Work

Here's what that looks like in practice.

We might track CPU usage or RAM usage over time. We keep a running count of API requests that we returned successfully or that errored out. We can also track how long that API call took with an average or a histogram.

This is fundamentally different from logs and traces. Logs and traces are raw events with full context like the user ID and the exact error message. Traces show the flow of events through your system. Metrics trade detail for efficiency.

## Inside the Time Series Database

In a time series database (TSDB) where metrics are stored, the metric's name is converted to a label. All of these key-value style labels are used to create a unique ID for this metric.

If any one label changes, bam, new metric.

For a new metric, the TSDB allocates an array and tracks the next free index that hasn't been filled yet. Each index holds a timestamp (usually an unsigned 64-bit integer) and a measurement value (usually a float64).

Each time a metric sample comes in, it's mapped to the correct array. The timestamp (usually right now) and the value are stored in the index location. The index is incremented for the next sample.

With modern compression techniques, it's not hard to achieve on average 1.5 bytes per sample. This makes storing metrics incredibly efficient and cheap.

Selecting sub-ranges of these arrays is also a cheap operation. This makes queries fast and effective. Graphs become plentiful.

## Building Models of Complex Systems

I think of good metrics as being able to build an intentional model of a complex system.

A model here is a simplified, abstract representation of a system that explains observations and makes predictions. Think about how Newton's laws of motion were able to build a model of planetary movement in our solar system.

There's a common saying: all models are wrong, but some are useful.

Einstein later improved our model of the solar system and corrected details that Newton could not account for. This is how our understanding of a complex system grows and matures over time.

## The Downsides

What are the weak points of using metrics?

**Number one:** You cannot extract a single raw event or sample from the collected metrics. While you can generate a P99 percentile of latency around a given point in time, you cannot recover the exact latency of a specific user's request.

**Number two:** Avoiding cardinality explosions. Look again at the data type. The memory or space complexity is O(n²). The number of metrics in the system maps to an exponential increase in memory requirements. Yikes.

This is usually kept in check by a relatively constant set of active metrics.

A cardinality explosion happens when there are more possible unique metrics (think about those key-value style labels) than data samples. This leads to a sparse matrix in the TSDB's memory where a metric only contains one or two data points.

Suddenly things become very expensive and very inefficient.

## Wrapping Up

A metric is most definitely not any number you can squeeze out of your observability platform.

It is a specific data type with strengths and weaknesses. It is one of many options we have available to us in observability.

Remember Newton and Einstein. Metrics build models of complex systems.

## Ready to Build Better Metrics?

Understanding what metrics are and how they work is fundamental to implementing effective SLO-based alerting. The Prometheus Alert Generator and Resource Calculator help you build well-structured recording rules and alerts that avoid common pitfalls like cardinality explosions.

Need expert help designing your observability architecture? Cardinality Cloud, LLC specializes in Prometheus, SLO implementation, and cost-effective observability strategies.

[Learn more about what we can do for you &rarr;](https://cardinality.cloud)
