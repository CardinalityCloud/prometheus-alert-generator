# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a free web-based tool for generating Prometheus alerting rules with SLO (Service Level Objective) support. The application generates both SLO-based burn rate alerts and traditional availability alerts for monitoring applications.

**Key Features:**
- SLO-based alerting with multi-window burn rate detection
- Traditional liveness/availability monitoring
- YAML configuration export for Prometheus
- Form validation for PromQL metric patterns
- Custom alert labels and annotations support

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

### Application Structure

The app is a single-page application with three routes defined in `src/App.tsx`:
- `/` - Main rule generator (`PrometheusRuleGenerator` component)
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
