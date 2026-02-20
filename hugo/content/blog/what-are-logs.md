---
title: "What Really Are Logs?"
date: 2026-02-19
author: "Cardinality Cloud"
tags: ["logging", "syslog", "structured-logging", "observability", "fundamentals"]
description: "Logs are a specific observability data type with roots in 45-year-old Syslog. Learn structured logging, log levels, canonical events, and the SEARCH Method."
image: "blog/what-are-logs-social.png"
canonical: "https://cardinality.cloud/blog/what-are-logs/"
---

{{< youtube d7mSgcfe3rQ >}}

The best technical standard ever created came from one of the worst codebases in Unix history.

Syslog. Written by Eric Allman in the early 1980s as part of Sendmail. If you've ever been exposed to sendmail.cf and M4 configuration, that name should strike fear into your heart. But Allman got one thing exactly right: he made Syslog simple. So simple it became the de facto standard across Unix-like systems and network equipment for 45 years. RFC 3164 didn't formalize it until nearly 2003. RFC 5424 wasn't ratified until 2009.

<!--more-->

The power that made Syslog the de facto standard? Its simplicity.

So let's start there.

## The Three Parts of a Syslog Message

Every Syslog message has three components.

**Priority.** On the wire, this is a decimal number inside angle brackets like `<38>`. It encodes the facility (which part of the system generated the message) and the severity (what we now call log levels). The upper five bits are the facility. The lower three bits are the severity.

**Header.** A timestamp and hostname. Simple. Notably, no year and no time zone.

**Message.** Formatted as `tag[pid]: free text`. The tag was usually the process name.

A full message looks like:

```
<38>Feb  7 14:23:09 webserver sshd[1234]: Accepted publickey for jack
```

Simple. Maybe too simple. When RFC 5424 tried to fix the obvious timestamp issues and add structured key-value pairs, it added a namespace convention similar to LDAP. Nobody adopted it. Teams just stuffed JSON into the message field instead. Making Syslog more capable made it much less simple, and it stalled.

## The Severity Levels You're Already Using

The Syslog severity scale is a 3-bit field with 8 values:

| Value | Level | Description |
|---|---|---|
| 0 | Emergency | System is unusable |
| 1 | Alert | Action must be taken immediately |
| 2 | Critical | Critical conditions |
| 3 | Error | Error conditions |
| 4 | Warning | Warning conditions |
| 5 | Notice | Normal but significant |
| 6 | Informational | Informational messages |
| 7 | Debug | Debug-level messages |

Look familiar? If you are using Log4J, Python's logging module, or any modern logging library, you are using a derivative of this 45-year-old standard.

## Logs as a Data Type

Logs are the oldest observability signal, and they carry 45 years of well-developed practice for pipelining and analyzing them.

In the observability space, logs are a specific data type, just like metrics are. If you haven't seen the [What Really Is a Metric?](/blog/what-are-metrics/) post, the key idea is that observability signals are distinct data types with specific strengths and trade-offs. Logs are the most flexible of those signals.

Think of a log as a row in a wide database table. Each row can have a large number of fields. Unlike metrics, a field in a log can hold any value without causing a cardinality explosion, since logs do not use a sparse time-series matrix. This means you should use unique identifiers, transaction IDs, usernames, and anything else that makes the log fully descriptive of the event it represents.

The key rule: use the same field names consistently across services. If an IP address appears in your logs, call it the same thing everywhere. When you pipeline logs through a centralized platform, annotate them consistently with pod name, service, namespace, and Kubernetes cluster.

## The SEARCH Method

How do you write effective logs in your applications? The SEARCH Method is a framework for exactly this. Here's the core:

**S** - **Structured JSON** with a flexible schema
**E** - Log **Errors** with stack traces and error IDs
**A** - Always **Audit** the action: read, write, GET, POST, etc.
**R** - What **Resources** and users were affected
**C** - Log status **Codes** and use log levels
**H** - Include a **Human** readable message field

## Log Levels in Practice

Here's how to actually use log levels day-to-day:

**TRACE.** Track logic per function, method, I/O operation. Honestly, if you're here, you probably want the tracing observability signal instead. But this level exists and works well for deep problem solving.

**DEBUG.** Diagnostics helpful to people on call, not just developers. Expect this level and below to be filtered out in production.

**INFO.** One canonical event per API call or transaction. This is the most important level to get right.

**WARN.** Any condition the application self-recovered from without user impact, or a condition that might become a problem later.

**ERROR.** Any condition, with stack trace, that caused a user-visible failure.

## Canonical Logs: The INFO Level Done Right

Most teams get this right in theory and wrong in practice.

The INFO level should produce one wide event per request. Canonical logs. Apache and Nginx access logs are the classic example. Not JSON, but completely structured and containing every single detail about the HTTP request in a single line:

```
192.168.1.105 - jack [07/Feb/2025:14:23:09 -0500] "GET /api/v1/users/12345 HTTP/1.1" 200 4523 request_time=0.234
```

Your application should do the same thing in JSON. One authoritative log entry per transaction. Think of it as a receipt. Your code can emit debug logs and error logs throughout the request lifecycle, but there should always be one INFO-level canonical log that tells the complete story.

## The Downsides

Logs are the most flexible signal, but that flexibility comes with costs.

**Volume.** I have worked with logging platforms handling hundreds of terabytes per day. This makes logs expensive to store and slow to analyze. Do not default to logs for real-time alerting, though modern stacks make it possible.

**Unstructured logs are fragile.** Subtle application changes break the complex regex patterns required to parse them. They also require more advanced (read: more expensive) tooling. Bad practices on the application side create exponential costs on the platform side.

**Field cardinality limits.** While a field value in a log can be anything, the number of fields a system can realistically support is bounded. OpenSearch and Elasticsearch default to 1000 fields per index. I've seen teams push this to 3000. Use a field mapping.

**Watch out for SDK-embedded log streaming.** Some SDKs encode logs directly in the application and batch them in binary format to a collector. OpenTelemetry, I'm looking at you. If your observability pipeline goes down and you can't debug the part of your system that makes money, that's a problem. Be careful about the blast radius you're creating.

## So, What Are Logs?

- Logs are **data**
- Logs are **rows in a database** of transactions
- Logs are **canonical events**
- Logs are **structured JSON**
- Logs are **schematized**
- Logs are the **next generation** of Syslog
- Logs are **human readable**

We stand on the shoulders of giants here. 45 years of practice has shaped what good logging looks like. The job now is to build on that foundation, not ignore it.

## Ready to Improve Your Observability?

Understanding what logs are is fundamental to building effective observability alongside your metrics and alerting strategy. The Prometheus Alert Generator helps you build well-structured alerting rules that complement your logging and tracing work.

Need expert help designing your observability architecture? Cardinality Cloud, LLC specializes in Prometheus, SLO implementation, and cost-effective observability strategies.

[Learn more about what we can do for you &rarr;](https://cardinality.cloud)
