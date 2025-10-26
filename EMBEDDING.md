# Embedding the React App in Hugo

## Overview

The React application (Alert Generator and Resource Calculator) is embedded within the Hugo static site at `/app/`. Hugo provides the site chrome (masthead, footer, navigation) while React handles the interactive tools.

## Architecture

```
┌─────────────────────────────────────────┐
│          Hugo Site (hugo/)              │
│  ┌───────────────────────────────────┐  │
│  │ Masthead (Hugo partial)           │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  React App Mount Point (#root)   │  │
│  │  - Alert Generator (/app/)       │  │
│  │  - Resource Calculator (/app/... │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Footer (Hugo partial)             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Build Flow

1. **React App Build** (`app/`)
   ```bash
   npm run build
   ```
   - Builds to: `hugo/static/app/`
   - Base path: `/app/`
   - Output: `index.html`, `assets/*.js`, `assets/*.css`

2. **Hugo Build** (`hugo/`)
   ```bash
   hugo
   ```
   - Wraps React app with site chrome
   - Serves blog and FAQ as static pages
   - Output: `hugo/public/`

## Configuration

### Vite Config (`app/vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/app/',  // Serves from /app/ path
  build: {
    outDir: '../hugo/static/app',  // Build into Hugo
    emptyOutDir: true,
  },
})
```

### React Router (`app/src/App.tsx`)

```typescript
<BrowserRouter basename="/app">
  <Routes>
    <Route path="/" element={<PrometheusRuleGenerator />} />
    <Route path="/resources" element={<ResourceCalculator />} />
  </Routes>
</BrowserRouter>
```

### Hugo Layout (`hugo/layouts/app/app.html`)

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Hugo styles -->
  <link rel="stylesheet" href="/css/bundle.css">

  <!-- React app assets (dynamically loaded) -->
  {{- $appAssets := readDir "static/app/assets" -}}
  {{- range $appAssets -}}
    {{- if strings.HasSuffix .Name ".css" -}}
  <link rel="stylesheet" href="/app/assets/{{ .Name }}">
    {{- end -}}
  {{- end -}}
</head>
<body>
  <div class="container">
    {{ partial "masthead.html" . }}

    <main>
      <div id="root"></div>  <!-- React mounts here -->
    </main>

    {{ partial "footer.html" . }}
  </div>

  <!-- React app JS -->
  {{- range $appAssets -}}
    {{- if strings.HasSuffix .Name ".js" -}}
  <script type="module" src="/app/assets/{{ .Name }}"></script>
    {{- end -}}
  {{- end -}}
</body>
</html>
```

### Hugo Content (`hugo/content/app/_index.md`)

```yaml
---
title: "Prometheus Alert Generator"
layout: "app"
---
```

## URL Routes

| URL                     | Handler      | Description              |
|-------------------------|--------------|--------------------------|
| `/`                     | Hugo         | Homepage                 |
| `/blog/`                | Hugo         | Blog listing             |
| `/blog/article/`        | Hugo         | Blog article (static)    |
| `/faq/`                 | Hugo         | FAQ page (static)        |
| `/app/`                 | React (Hugo) | Alert Generator          |
| `/app/resources`        | React (Hugo) | Resource Calculator      |

## Shared Styling

Both Hugo and React use the same design tokens:

- **Source**: `shared/design-tokens.json`
- **Hugo**: `shared/build/tokens.css` → `hugo/assets/css/tokens.css`
- **React**: Imports `design-tokens.json` directly in `app/src/theme.ts`

## Development Workflow

### Option 1: React Only (No Hugo chrome)

```bash
cd app
npm run dev
# http://localhost:5173
```

Use for rapid React development. No masthead/footer.

### Option 2: Full Integration (With Hugo chrome)

```bash
# Build React app
cd app && npm run build && cd ..

# Run Hugo server
cd hugo && hugo server
# http://localhost:1313/app/
```

Use to test full integration with Hugo masthead/footer.

## Production Build

```bash
./build.sh
```

Outputs to `hugo/public/` ready for deployment.

## Benefits of This Approach

✅ **SEO-friendly blog/FAQ**: Server-rendered Hugo pages
✅ **Interactive tools**: React for complex UX
✅ **Shared design**: Single source of truth for styling
✅ **Simple deployment**: Single static site output
✅ **Clean separation**: Hugo = content, React = tools

## Limitations

⚠️ React app assets have hashed names that change on each build
✅ Solved with Hugo's `readDir` to dynamically find assets

⚠️ React needs to match Hugo's routing
✅ Solved with `basename="/app"` in React Router

⚠️ Masthead/Footer removed from React components
✅ Solved by Hugo providing site chrome
