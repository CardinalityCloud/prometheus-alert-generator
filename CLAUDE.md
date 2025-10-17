# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a free web-based tool suite for Prometheus monitoring, providing two main tools:

1. **Alert Rule Generator** - Generates Prometheus alerting rules with SLO (Service Level Objective) support
2. **Resource Calculator** - Calculates memory, CPU, and disk space requirements for Prometheus deployments

**Key Features:**
- SLO-based alerting with multi-window burn rate detection
- Traditional liveness/availability monitoring
- YAML configuration export for Prometheus
- Form validation for PromQL metric patterns
- Custom alert labels and annotations support
- Resource requirement calculations based on time series count, scrape interval, and retention period

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Lint the codebase
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Tech Stack
- **Frontend Framework:** React 19 with TypeScript
- **Build Tool:** Vite
- **UI Framework:** Mantine v8 (components, forms, hooks)
- **Routing:** React Router DOM v7
- **YAML Processing:** js-yaml
- **Icons:** Tabler Icons React
- **Data Visualization:** Observable Plot (for resource calculator charts)

### Application Structure

The app is a single-page application with four routes defined in `src/App.tsx`:
- `/` - Main rule generator (`PrometheusRuleGenerator` component)
- `/resources` - Resource calculator (`ResourceCalculator` component)
- `/faq` - FAQ page (`Faq` component)
- `*` - 404 page (`NotFound` component)

### Core Generator Logic (`src/prometheus-rule-generator.tsx`)

This is the main component (~1100 lines) that handles:

1. **Form Management:** Uses `@mantine/form` with validation for:
   - PromQL metric pattern validation (metric names and label selectors)
   - Required fields (app name, SLO type)
   - Custom alert labels/annotations parsing

2. **Rule Generation:** Creates two types of outputs:
   - **Prometheus Rules YAML:** Recording rules for SLO metrics and alerting rules for burn rate detection
   - **Configuration JSON:** Allows users to save/load form state via file upload/download

3. **SLO Calculation Logic:**
   - Supports availability and latency SLO types
   - Generates multi-window burn rate alerts:
     - **Fast burn (critical):** 14.4x error budget consumption over 1h window
     - **Slow burn (warning):** 6x error budget consumption over 6h window
   - Creates recording rules for success ratios at multiple time windows (5m, 1h, 6h)
   - Calculates error budget remaining over configurable windows (default: 30d)

4. **PromQL Query Construction:**
   - Wraps user-provided raw metrics with `sum(rate(...))` aggregations
   - Defaults to `http_requests_total` with appropriate label matchers if not specified
   - Supports custom metric queries with label selectors

### Resource Calculator (`src/ResourceCalculator.tsx`)

This component calculates Prometheus resource requirements based on user input:

1. **Input Parameters:**
   - **Active Time Series** (required): Number of unique time series tracked by Prometheus
   - **Scrape Interval** (default 60s): How often Prometheus scrapes metrics
   - **Retention Period** (default 30 days): How long to keep historical data

2. **Calculations:**
   - **Memory:** Based on 7.5 KiB per time series (recommended), with safe range of 7-9 KiB
   - **CPU Cores:** `Math.max(2, Math.round(memoryGB / 4))` - 1 core per 4GB of memory, minimum 2 cores
   - **Disk Space:** `(timeSeries × (retentionDays × 86400 / scrapeInterval) × 1.5 bytes per sample) / (1024³) × 1.2`
     - Assumes 1.5 bytes per sample
     - Includes 20% buffer for WAL (Write-Ahead Log)
     - Automatically displays in GB or TB based on size

3. **Visualization:**
   - Uses Observable Plot to render interactive chart showing memory requirements
   - Displays three lines: lower bound (7 KiB), recommended (7.5 KiB), upper bound (9 KiB)
   - Shows example configuration dots at 100K, 200K, 500K, 1M, 2M, 5M, and 10M time series
   - User's configuration appears as a red dot on the chart
   - Logarithmic x-axis scale for better visualization across orders of magnitude
   - Tooltips show memory requirements and safe ranges for each point

### Shared Components

**`src/components/Masthead.tsx`:**
- Reusable header component with navigation between tools
- Props control visibility of Alert Generator, Resource Calculator, and FAQ buttons
- Consistent branding across all pages

**`src/components/Footer.tsx`:**
- Reusable footer with links to GitHub, FAQ, Blog, and Email feedback
- Displays app version and build date
- Uses HTML entities for special characters

**`src/theme.ts`:**
- Shared Mantine theme configuration
- Inter font family, blue color scheme, custom shadows
- Consistent styling across all pages

### FAQ Content (`src/faq-content.ts`)

Structured FAQ items with markdown support, icons, and unique IDs for navigation. The FAQ is rendered using `react-markdown` in `src/Faq.tsx`.

### Build Configuration

**Vite Config (`vite.config.ts`):**
- Defines build-time constants: `__APP_VERSION__`, `__GIT_COMMIT_SHA__`, `__BUILD_DATE__`
- Uses `@vitejs/plugin-react` for Fast Refresh

**TypeScript:**
- Project uses TypeScript 5.9 with separate configs:
  - `tsconfig.app.json` - App source code
  - `tsconfig.node.json` - Vite/build tooling
  - `tsconfig.json` - References both configs

**ESLint:**
- Uses flat config format (`eslint.config.js`)
- Extends recommended configs from ESLint, TypeScript ESLint, React Hooks, and React Refresh
- Ignores `dist/` directory

## Key Concepts for Development

### SLO and Burn Rate Alerting

The core value of this tool is generating Google SRE-style multi-window, multi-burn-rate alerts:

- **SLO (Service Level Objective):** Target reliability percentage (e.g., 99.9%)
- **Error Budget:** Allowed failure rate (100% - SLO target)
- **Burn Rate:** How quickly error budget is being consumed relative to the target rate
- **Multi-window detection:** Requires burn rate to persist across two time windows to reduce false positives

Example: With a 99.9% SLO over 30 days:
- Error budget: 0.1% (43.2 minutes of downtime per month)
- Fast burn (14.4x): Would exhaust budget in ~2 days if sustained
- Slow burn (6x): Would exhaust budget in ~5 days if sustained

### PromQL Pattern Validation

The app validates user-provided PromQL metric patterns in `validatePromQLMetric()`:
- Metric names must match: `[a-zA-Z_:][a-zA-Z0-9_:]*`
- Label selectors must use format: `label_name="value"` or `label_name=~"regex"`
- Supports `=`, `=~`, `!=`, `!~` operators

### Recording Rules vs Alerting Rules

The generated Prometheus rules include:
1. **Recording rules:** Pre-compute SLO metrics (success ratios, error ratios, error budget remaining)
2. **Alerting rules:** Fire when burn rate thresholds are exceeded across multiple time windows

This separation improves query performance and allows dashboard visualization of SLO metrics.

**Design Pattern:** Alerting rules and dependent recording rules dynamically reference the `job:slo_goal:ratio` recording rule (e.g., `1 - job:slo_goal:ratio{...}`) rather than embedding hardcoded error budget values. This allows the SLO goal to be adjusted by updating a single recording rule without regenerating the entire configuration.

## Deployment

The app is deployed as a static site (hosted at prometheus-alert-generator.com). Key files:
- `public/404.html` - Custom 404 page for SPA routing
- `public/robots.txt` - Search engine directives
- `public/sitemap.xml` - Site map for SEO
- `public/og-image.png` - Open Graph preview image

Build output goes to `dist/` and is gitignored.
