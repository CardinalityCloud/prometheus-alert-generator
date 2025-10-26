## Prometheus Alert Generator

Free web-based tools for Prometheus monitoring: SLO-based alert rule generator and resource calculator.

### Project Structure

This is a monorepo containing:

- **`app/`** - React/Vite application (Alert Generator and Resource Calculator)
- **`hugo/`** - Hugo static site (Blog, FAQ, and site wrapper)
- **`shared/`** - Shared design tokens used by both React and Hugo

### Quick Start

```bash
# Build everything
./build.sh

# Development - Hugo site with React app
./build.sh
cd hugo
hugo server
```

Visit:
- Alert Generator: `http://localhost:1313/app/`
- Resource Calculator: `http://localhost:1313/app/resources`
- Blog: `http://localhost:1313/blog/`
- FAQ: `http://localhost:1313/faq/`

### How It Works

1. The React app builds to `hugo/static/app/` with `basename="/app"`
2. Hugo wraps the React app with masthead, footer, and provides blog/FAQ
3. The React app handles routing for `/app/` and `/app/resources`
4. Blog and FAQ are server-rendered Hugo pages with better SEO

### Building

#### React App Only

```bash
cd app
npm run build
```

This builds the React app to `hugo/static/app/`.

#### Full Site

```bash
./build.sh
```

This builds:
1. React app → `hugo/static/app/`
2. Hugo site → `hugo/public/`

### Development

#### React App Development (Standalone)

```bash
cd app
npm run dev
```

Access at `http://localhost:5173`

**Note:** Runs standalone without Hugo masthead/footer. Use Hugo server for full experience.

#### Hugo Development (Recommended)

```bash
# Build React app first
cd app && npm run build && cd ..

# Run Hugo server
cd hugo
hugo server
```

Access at `http://localhost:1313`

The React app will be embedded at `/app/` with full Hugo chrome.

### Design Tokens

Shared design tokens are in `shared/design-tokens.json`.

To regenerate CSS from tokens:

```bash
cd shared
node generate-css.js
```

This generates:
- `shared/build/tokens.css` - Copied to Hugo assets
- `shared/build/tokens.scss` - SCSS variables (if needed)

The React app imports tokens directly from `design-tokens.json`.

### Deployment

Build the full site:

```bash
./build.sh
```

Deploy `hugo/public/` to your web host. This includes:
- Hugo-rendered pages (homepage, blog, FAQ)
- React app at `/app/` (embedded with Hugo chrome)
- All static assets

### License

Apache 2.0 - See LICENSE file
