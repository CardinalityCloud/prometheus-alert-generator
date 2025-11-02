# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This repository contains two main parts:

1. **React Applications** (`pag/` and `prc/` directories) - Interactive tools built with React and React-Bootstrap:
   - `pag/` - Alert Rule Generator
   - `prc/` - Resource Calculator
   - Built as theme-neutral static SPAs
   - Embedded into the Hugo site via static file deployment

2. **Hugo Marketing Site** (`hugo/` directory) - Static site with blog and documentation:
   - Marketing pages and tool landing pages
   - Blog articles about Prometheus and SLOs
   - FAQ section with technical content
   - Provides theming when React apps are embedded
   - **See `hugo/CLAUDE.md` for Hugo-specific documentation**

## Project Overview - React Applications

The `pag/` and `prc/` directories contain React-based interactive tools for Prometheus monitoring:

1. **Alert Rule Generator** (`pag/`) - Generates Prometheus alerting rules with SLO (Service Level Objective) support
2. **Resource Calculator** (`prc/`) - Calculates memory, CPU, and disk space requirements for Prometheus deployments

**Key Features:**
- SLO-based alerting with multi-window burn rate detection
- Traditional liveness/availability monitoring
- YAML configuration export for Prometheus
- Form validation for PromQL metric patterns
- Custom alert labels and annotations support
- Resource requirement calculations based on time series count, scrape interval, and retention period

## Development Commands

Each React app (`pag/` and `prc/`) has its own build process. Navigate to the app directory first:

```bash
cd pag/  # or cd prc/

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
- **UI Framework:** React-Bootstrap 2.10+ with Bootstrap 5.3
- **YAML Processing:** js-yaml
- **Icons:** Tabler Icons React
- **Data Visualization:** Observable Plot (Resource Calculator only)

**Note:** The React apps are theme-neutral. Styling/theming is provided by the Hugo site when the apps are embedded. The apps use standard Bootstrap components without custom theming.

### Application Structure - Alert Generator (`pag/`)

The Alert Generator is a single-page application that provides:

**Core Files:**
- `src/App.tsx` - Main application component
- `src/prometheus-rule-generator.tsx` - Form and rule generation logic (~1100 lines)
- `src/components/` - Reusable React components
- `vite.config.ts` - Vite build configuration
- `index.html` - Entry point

**Key Components:**

1. **Form Management:** Uses React-Bootstrap forms with custom validation:
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

### Application Structure - Resource Calculator (`prc/`)

The Resource Calculator calculates Prometheus resource requirements based on user input:

**Key Files:**
- `src/App.tsx` - Main application component
- `src/ResourceCalculator.tsx` - Calculator logic and visualization
- `src/components/` - Reusable React components

**Functionality:**

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

### Build Configuration

**Vite Config (`vite.config.ts`):**
- Defines build-time constants: `__APP_VERSION__`, `__GIT_COMMIT_SHA__`, `__BUILD_DATE__`
- Uses `@vitejs/plugin-react` for Fast Refresh
- Outputs to `dist/` directory

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

The core value of the Alert Generator is creating Google SRE-style multi-window, multi-burn-rate alerts:

- **SLO (Service Level Objective):** Target reliability percentage (e.g., 99.9%)
- **Error Budget:** Allowed failure rate (100% - SLO target)
- **Burn Rate:** How quickly error budget is being consumed relative to the target rate
- **Multi-window detection:** Requires burn rate to persist across two time windows to reduce false positives

Example: With a 99.9% SLO over 30 days:
- Error budget: 0.1% (43.2 minutes of downtime per month)
- Fast burn (14.4x): Would exhaust budget in ~2 days if sustained
- Slow burn (6x): Would exhaust budget in ~5 days if sustained

### PromQL Pattern Validation

The Alert Generator validates user-provided PromQL metric patterns in `validatePromQLMetric()`:
- Metric names must match: `[a-zA-Z_:][a-zA-Z0-9_:]*`
- Label selectors must use format: `label_name="value"` or `label_name=~"regex"`
- Supports `=`, `=~`, `!=`, `!~` operators

### Recording Rules vs Alerting Rules

The generated Prometheus rules include:
1. **Recording rules:** Pre-compute SLO metrics (success ratios, error ratios, error budget remaining)
2. **Alerting rules:** Fire when burn rate thresholds are exceeded across multiple time windows

This separation improves query performance and allows dashboard visualization of SLO metrics.

**Design Pattern:** Alerting rules and dependent recording rules dynamically reference the `job:slo_goal:ratio` recording rule (e.g., `1 - job:slo_goal:ratio{...}`) rather than embedding hardcoded error budget values. This allows the SLO goal to be adjusted by updating a single recording rule without regenerating the entire configuration.

## Character Encoding Standards

**All source files use 7-bit ASCII only:**
- Special characters use HTML entities (e.g., `&amp;copy;`, `&amp;bull;`, `&amp;larr;`, `&amp;rarr;`)
- Icons use Tabler Icons React components (SVG-based)
- Math symbols use LaTeX syntax when rendering math
- No UTF-8 characters beyond ASCII range (no emoji, no special Unicode)

**Examples:**
- Copyright: `&amp;copy;` not `©`
- Bullet: `&amp;bull;` not `•`
- Arrows: Use `&lt;IconArrowLeft /&gt;` component, not `←` character
- Arrows in text: `&amp;larr;` and `&amp;rarr;` not `←` and `→`

**Why ASCII-only?**
- Consistent rendering across all systems and editors
- No encoding issues with Git, editors, or build tools
- Explicit intent (HTML entities and React components are self-documenting)
- Works correctly when embedded in Hugo site

## React-Bootstrap Usage

The apps use React-Bootstrap components in their default styling:

**Common Components:**
- `Form`, `Form.Control`, `Form.Group`, `Form.Label`
- `Button`, `ButtonGroup`
- `Card`, `Container`, `Row`, `Col`
- `Alert`, `Badge`, `Tabs`, `Tab`

**No Custom Theming:**
- Apps use Bootstrap's default styling
- No custom CSS beyond minimal layout adjustments
- Theming is provided by the Hugo site when apps are embedded
- This keeps the apps portable and theme-neutral

## Deployment

The React apps are built as static SPAs and integrated into the Hugo marketing site:

**Build Process:**
1. Build each React app separately: `npm run build` (in `pag/` or `prc/`)
2. Build output (`dist/`) is copied to Hugo's `hugo/static/pag/` and `hugo/static/prc/` directories
3. Hugo site serves the React apps as static files
4. Hugo landing pages link to or embed the apps

**React App Build Output:**
- `dist/` - Build output directory (gitignored in React app dirs)
- `dist/index.html` - SPA entry point
- `dist/assets/` - Bundled JS, CSS, and assets

**Integration:**
- Hugo site hosted at prometheus-alert-generator.com
- React apps accessible at `/pag/` and `/prc/` routes
- Apps pick up theming from Hugo site when embedded
- See `hugo/CLAUDE.md` for Hugo deployment details

## Common Tasks

### Testing Locally

1. Start the React app dev server:
   ```bash
   cd pag/  # or prc/
   npm run dev
   ```

2. App runs at `http://localhost:5173` (or similar)

3. Test independently of Hugo site

### Building for Production

1. Build the React app:
   ```bash
   cd pag/  # or prc/
   npm run build
   ```

2. Copy `dist/` contents to Hugo:
   ```bash
   cp -r dist/* ../hugo/static/pag/  # or prc/
   ```

3. Build Hugo site (see `hugo/CLAUDE.md`)

### Adding New Features

1. Implement feature in React app (`src/` directory)
2. Test locally with `npm run dev`
3. Ensure forms use React-Bootstrap components
4. Follow ASCII-only character encoding standards
5. Build and deploy to Hugo site

## File Structure Reference

```
pag/                          # Alert Generator React app
├── src/
│   ├── App.tsx              # Main application
│   ├── prometheus-rule-generator.tsx  # Core generator logic
│   ├── components/          # Reusable components
│   └── ...
├── public/                  # Static assets
├── dist/                    # Build output (gitignored)
├── package.json
├── vite.config.ts
└── tsconfig.*.json

prc/                          # Resource Calculator React app
├── src/
│   ├── App.tsx              # Main application
│   ├── ResourceCalculator.tsx  # Calculator logic
│   ├── components/          # Reusable components
│   └── ...
├── public/                  # Static assets
├── dist/                    # Build output (gitignored)
├── package.json
├── vite.config.ts
└── tsconfig.*.json

hugo/                         # Hugo marketing site (see hugo/CLAUDE.md)
├── static/
│   ├── pag/                 # Deployed Alert Generator
│   └── prc/                 # Deployed Resource Calculator
└── ...
```
