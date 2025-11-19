+++
date = '2025-11-19'
draft = false
title = 'The Four Golden Signals: What to Monitor'
slug = 'golden-metrics'
author = 'Cardinality Cloud'
tags = ['prometheus', 'monitoring', 'golden-signals', 'slo', 'observability']
description = 'Stop drowning in metrics and high observability bills. Learn which Four Golden Signals actually matter for monitoring—and how they form the foundation of SLO-based alerting.'
+++

The observability vendors charge by the byte. They want you to send everything.
The industry tells you to [measure everything][1]. So you instrument
everything, send it all to your vendor, and wait for clarity.

Instead, you get an Observability bill that's higher than your AWS or GCP
compute costs. And you still can't answer basic questions: Is my application
healthy? Are customers experiencing problems right now? Should I be paging
someone?

Even with a top-tier vendor and unlimited budget, more data doesn't equal more
clarity. You're drowning in metrics, dashboards, and alerts &mdash; but you
still don't know what actually matters.

<!--more-->

So what do you monitor?

## The Four Golden Signals

I don't know how many times I've been asked "...well, what do I monitor?"
Usually this is followed by more questions about metrics and tracing and much
confusion. I've found that a simple and memorable acronym and rule really
helps. Not only does it answer the question, but it builds a data-driven
culture and fosters understanding.

Measure the [Four Golden Signals][2] (4GS). Make sure your application or service
has a ticket or checkbox that it is 4GS enabled. Let's dig in.

### 1: Traffic

Your application does some repeatable unit of work. That may be HTTP
requests, API requests, batch jobs, scheduled jobs &mdash; it does repeatable work.
You want to count this. With Prometheus or OpenTelemetry instrumentation,
set up a `Counter` type metric and increment it by 1 for every unit of work.

### 2: Errors

Some of these units of work are going to fail. Again, create a `Counter` type
metric and increment by 1 for each failure!

### 3: Latency

That unit of work takes time to complete. We want to track an aggregation or
distribution of this so that we can see changes in behavior over time. In
Prometheus, use a `Histogram` or `Summary` metric type. OpenTelemetry also offers
a `Histogram` type. Remember, metrics are aggregations of events &mdash; we're not
looking to record a recoverable data point for each event (that's what traces
are for), but we want to build that aggregation we can use over time.

### 4: Saturation or Capacity

This answers the question "When do I need to scale up or down?" If you are
running Pods in Kubernetes, think about when you would create more (or fewer)
replicas of those Pods in your Deployment definition. This may be a ratio of
how much CPU is being used compared to the resource limits. Similar for
memory. Also, think about how many concurrent units of work the application
can handle. Or, simpler, the rate at which we can handle units of work. Give
your team a single, clear indicator of when to add more resources.

## Conclusion

I require that every application or service I work with have the following
metrics and a graph to go with it:

1. Traffic
1. Errors
1. Latency / Duration
1. Capacity

Red flags to watch out for include just relying on the system or Kubernetes
itself to give you this information. That's helpful, but it doesn't correlate
with what you and your team need to know &mdash; how happy your customers are.

This is where to start with monitoring and gives you a number of good KPIs out
of the box.

## From Golden Signals to SLOs

The Four Golden Signals don't just provide visibility &mdash; they form the
foundation of Service Level Objectives (SLOs). Each signal directly translates
to measuring what your customers experience:

**Availability SLOs** are built from Traffic and Errors and show how successful
the application has been for your customers.

**Latency SLOs** are built from your Latency/Duration metrics and show whether
customers are getting fast responses from your application.

**Capacity SLOs** help you scale proactively, ensuring your application has
enough resources to serve customer demand without degradation.

By tracking these metrics consistently, you create the data foundation needed
for [SLO-based alerting](/blog/what-is-slo-why-slo-based-alerts/) and error
budget burn rate detection. Instead of arbitrary thresholds, your alerts fire
when you're at risk of missing your reliability commitments to customers.

## Go and OpenTelemetry Example

```golang
import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/metric"
)

// Create counter
counter, _ := otel.Meter("myapp").Int64Counter("requests.total")

// Increment by 1
counter.Add(context.Background(), 1)

// With attributes
counter.Add(ctx, 1, metric.WithAttributes(
    attribute.String("method", "GET"),
))

// Create histogram
histogram, _ := otel.Meter("myapp").Float64Histogram("request.duration")

// Record value (e.g., duration in seconds)
histogram.Record(ctx, 0.234)

// With attributes
histogram.Record(ctx, 0.234, metric.WithAttributes(
    attribute.String("endpoint", "/api/users"),
))
```

[1]: https://www.etsy.com/codeascraft/measure-anything-measure-everything
[2]: https://sre.google/sre-book/monitoring-distributed-systems/
