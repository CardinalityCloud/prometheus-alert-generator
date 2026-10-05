---
title: "The Scrape Interval That Didn't Matter (And Why It Should Have)"
date: 2026-10-05
draft: true
author: "Cardinality Cloud"
tags: ["prometheus", "capacity-planning", "resources", "kubernetes", "memory"]
description: "A bug in our Prometheus Resource Calculator led to a deeper look at what really drives Prometheus memory, and a new model calibrated against a GKE fleet and a 21 million series production instance."
math: true
---

I typed 60 into the scrape interval box. Then 15. Then 60 again.

The memory forecast didn't move.

That's a bug. Scrape four times as often and Prometheus holds four times as
many samples in memory. Any sizing tool that ignores that is going to be wrong,
and it was my sizing tool.

<!--more-->

## How the Old Model Worked

The original [Resource Calculator](/prc/) used one number for memory: **7.5
KiB per active time series.** That number was not a guess. It came from a
linear regression across literally thousands of Prometheus instances running in
GKE, measuring `container_memory_working_set_bytes` divided by
`prometheus_tsdb_head_series`. I rounded the result up to 7.5 KiB to cover
memory and query spikes. In the 2 to 12 million series range it was well
tuned. I trusted it.

So why did it ignore the scrape interval?

Because nearly every instance in that fleet scraped at 60 seconds. A regression
can't learn the effect of a variable that never changes. The cost of a 60s
scrape interval got baked into the 7.5 KiB constant, and the model had no way
to know that a 15s or 30s instance would cost more.

The scrape interval was only wired into the disk calculation. Memory never saw
it.

## What Actually Lives in Prometheus Memory

Fixing this properly meant breaking memory down into the things that drive it.

**The index.** Every active series carries a fixed cost: its labels, its
entries in the postings lists, the symbol table, and the series struct itself.
This cost depends on how many labels you have and how long they are. It does
not depend on how often you scrape.

**The head block.** Prometheus keeps the most recent 2 hours of samples in
memory before compacting them to disk. At a 60s interval that is 120 samples
per series. At 15s it is 480. This is the part the old model was missing.

**The Go runtime.** Prometheus is a Go program. Go's garbage collector needs
headroom above the live heap, and ingestion is allocation heavy. Every scrape
gets parsed, every sample gets appended, and the garbage piles up between
collections. More samples per second means more garbage.

**Startup and queries.** On restart, Prometheus replays its write-ahead log to
rebuild the head block, and memory spikes while it does. Queries pull data into
memory too. Small instances are the most exposed here, because a fixed size
spike is a large fraction of a small heap.

## The New Model

Each of those becomes a layer. First, the memory each series costs:

$$\text{Samples}_{head} = \frac{\text{head window}}{\text{scrape interval}}$$

$$\text{BaseHeap} = \text{Series} \times \left( C_{index} + \text{Samples}_{head} \times C_{mem\_sample} \right)$$

Then the Go runtime and ingestion overhead:

$$\text{WorkingSet} = \text{BaseHeap} \times 1.5$$

Then a safety buffer for WAL replay and query spikes. The buffer is 30%, but
never less than 1.5 GiB, so small instances survive a restart:

$$\text{Limit} = \max\left(\text{WorkingSet} \times 1.3,\ \text{WorkingSet} + 1.5\ \text{GiB}\right)$$

From the limit we derive the Kubernetes memory request (70% of the limit) and
`GOMEMLIMIT` (82% of the limit). `GOMEMLIMIT` matters more than most people
realize. Without it, Go has no idea a container limit exists, and it will
happily let the heap grow until the kernel OOM kills the process.

Disk stays simple. Total samples over the retention period times 1.5 bytes per
compressed sample, plus 15% for the WAL and compaction.

## Testing It Against a Real Instance

A model is only as good as the data you check it against. I pulled two days of
metrics from a production Prometheus HA set of three replicas running v2.52.0:
**21.3 million active series at a 30s scrape interval.** That is about 700,000
samples per second per replica.

Here is what each replica looks like per series, at the 99th percentile:

| Metric | Per Series | Per Replica |
|---|---|---|
| `container_memory_working_set_bytes` | 9.5 - 9.8 KiB | 193 - 199 GiB |
| `container_memory_rss` | 6.6 - 6.9 KiB | 134 - 140 GiB |
| `go_memstats_heap_inuse_bytes` | 5.9 - 6.1 KiB | 119 - 124 GiB |

The first lesson was in the gap between the first two rows. Working set
includes active page cache: the memory mapped head chunks and the block files
that queries read. That is about 60 GiB per replica, and the kernel can
reclaim it under pressure. **Working set overstates what Prometheus needs.
RSS is the number to size against,** because RSS is the memory that can't be
given back.

The second lesson was worse. The textbook version of this model uses 1.5 bytes
per sample for memory, the same as disk. Plug that in and the model sets
`GOMEMLIMIT` at about 6.0 KiB per series. The observed heap is 6.1 KiB.

That's a `GOMEMLIMIT` below the live heap. Go would run the garbage collector
continuously, trying to reach a target it can never hit. CPU goes to the moon,
ingestion falls behind, and you have an outage that looks nothing like an OOM.

1.5 bytes is what a sample costs once it is compressed on disk. It is not what
a sample costs to ingest. Memory needs its own number.

## Calibrating Against Both Data Sets

So the model now has two constraints, both from real Prometheus instances:

1. **The GKE fleet at 60s:** the memory limit must land between 6.5 and 7.5
   KiB per series from 2 to 10 million series. That is where the old 7.5 KiB
   lived, and it held up for years.
2. **The 21.3M series instance at 30s:** the working set must cover observed
   RSS, and `GOMEMLIMIT` must sit at least 10% above the observed heap.

An index cost of 2,900 bytes per series and an effective memory cost of 8
bytes per head sample satisfies both. At 60s, large instances land at 7.35 KiB
per series, right inside the fleet band. At 30s the same instance needs 9.18
KiB per series.

Here is what that means for a 5 million series Prometheus:

| Scrape Interval | Old Model | New Memory Limit | Per Series |
|---|---|---|---|
| 60s | 35.8 GiB | 35.1 GiB | 7.35 KiB |
| 30s | 35.8 GiB | 43.8 GiB | 9.18 KiB |
| 15s | 35.8 GiB | 61.3 GiB | 12.83 KiB |

At 60s, nothing much changes. That's the point: the fleet data was right for
the fleet it came from. At 15s the old model was short by almost half.

The 21.3M series instance tells the same story. The old model recommended 152
GiB against an RSS of 140 GiB, about 8% headroom. The new model recommends a
186.4 GiB limit with `GOMEMLIMIT` at 152.8 GiB, comfortably above the 124 GiB
heap.

Small instances changed too. At 100,000 series the old model said 0.72 GiB.
The new one says 2.1 GiB, because of the 1.5 GiB floor on the safety buffer.
That floor is there because a small Prometheus that gets OOM killed during WAL
replay will never finish starting up.

{{< warning title="Extrapolation" >}}
The 15s numbers are an extrapolation from two calibration points at 60s and
30s. If you run large Prometheus instances at 15s, I want to hear what your
RSS per series looks like.
{{< /warning >}}

## What Changed in the Calculator

The [Resource Calculator](/prc/) still asks for the same three things: active
time series, scrape interval, and retention. What comes back is different.

- **Kubernetes ready output.** A memory limit and request rounded up to
  the nearest 0.1 Gi, a `GOMEMLIMIT` value, a persistent volume size, and a
  container resources snippet you can paste into a manifest.
- **`GOMEMLIMIT` guidance.** Prometheus 3.x sets `GOMEMLIMIT` automatically
  with `--auto-gomemlimit`, at 90% of the container limit by default. The
  calculator shows the `--auto-gomemlimit.ratio` flag that matches the model.
- **Every assumption is visible.** One line of small text lists the constants
  behind the numbers. Click "Adjust assumptions" and you can change any of
  them. If your labels are long, raise the index cost. If you want more
  headroom, raise the safety multiplier.
- **Shareable links.** Your inputs and any changed assumptions live in the
  URL, so you can send your sizing to a teammate or drop it in a design doc.
- **Show the math.** "Show calculation" walks through every step with your
  numbers plugged in.
- **A better chart.** Memory limit, request, and working set plotted against
  active series on log scales, so you can see how memory grows as you
  scale.

CPU is still a rough guide based on GCP VM memory to CPU ratios. It tends to
over forecast, and I'm leaving it alone for now.

## Check Your Own Prometheus

You don't have to trust my constants. These queries tell you what your
Prometheus actually costs per series. Use a few days of data and look at the
99th percentile, not a single snapshot:

```promql
# Memory that can't be reclaimed, per series
quantile_over_time(0.99, container_memory_rss{container="prometheus"}[2d])
  / on(pod)
quantile_over_time(0.99, prometheus_tsdb_head_series[2d])

# Live Go heap, per series. GOMEMLIMIT must sit above this.
quantile_over_time(0.99, go_memstats_heap_inuse_bytes{job="prometheus"}[2d])
  / on(pod)
quantile_over_time(0.99, prometheus_tsdb_head_series[2d])
```

If your numbers disagree with the calculator, adjust the assumptions until they
match and share the link. That's what the settings are for.

A sizing model that ignores how often you collect data isn't a model. It's a
constant that happened to be right for one fleet.

[Try the updated Resource Calculator {{< icon "arrow-right" 16 "icon-sm" >}}](/prc/)
