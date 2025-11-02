# CLAUDE.md - Hugo Marketing Site

This file provides guidance to Claude Code (claude.ai/code) when working with the Hugo-based marketing and blog site.

## Project Overview

This is the Hugo-based marketing website and blog for the Prometheus Alert Generator tool suite. The site provides:

1. **Marketing Pages** - Information about the tools and how to use them
2. **Blog** - Technical articles about Prometheus monitoring, SLOs, and observability
3. **FAQ** - Frequently asked questions with rich content and math rendering
4. **Embedded Tools** - Iframes hosting the React-based Alert Generator and Resource Calculator

**Key Features:**
- Static site generation with Hugo
- SEO-optimized content with Open Graph and Twitter Card metadata
- KaTeX math rendering for technical content
- Tabler Icons as inline SVG
- Responsive design with Bootstrap 5
- Shared design system with React app via design tokens

## Development Commands

```bash
# Install Node dependencies (Bootstrap, Sass)
npm install

# Build CSS from SCSS (one-time)
npm run build:css

# Watch and rebuild CSS on changes (development)
npm run watch:css
# or
npm run dev

# Start Hugo development server (separate terminal)
hugo server -D

# Build production site
hugo --minify
```

## Architecture

### Tech Stack
- **Static Site Generator:** Hugo (latest)
- **CSS Framework:** Bootstrap 5.3.8 with custom SCSS
- **CSS Preprocessor:** Sass 1.93+
- **Icons:** Tabler Icons (SVG files in assets/icons/)
- **Fonts:** Fira Sans, Fira Mono (Google Fonts)
- **Math Rendering:** KaTeX 0.16.9 (via CDN)
- **Analytics:** Google Analytics

### Directory Structure

```
hugo/
├── archetypes/           # Content templates for new posts
├── assets/
│   ├── css/             # CSS files
│   │   ├── main.css     # Main stylesheet (Hugo-specific styles)
│   │   ├── tokens.css   # Auto-generated CSS custom properties
│   │   └── bootstrap.css # Generated from SCSS
│   ├── icons/           # Tabler Icons SVG files
│   └── scss/            # Bootstrap customization SCSS
├── content/             # Markdown content
│   ├── blog/            # Blog articles
│   ├── faq/             # FAQ articles
│   ├── pag/             # Alert Generator landing page
│   ├── prc/             # Resource Calculator landing page
│   └── terms/           # Terms of service, privacy policy
├── data/                # Data files (if needed)
├── layouts/             # Hugo templates
│   ├── _default/        # Default templates (baseof.html, single.html, list.html)
│   ├── blog/            # Blog-specific templates
│   ├── faq/             # FAQ-specific templates
│   ├── partials/        # Reusable template components
│   ├── shortcodes/      # Custom shortcodes for content
│   └── tags/            # Tag taxonomy templates
├── static/              # Static files (copied as-is to public/)
│   ├── pag/             # Built React app for Alert Generator
│   └── prc/             # Built React app for Resource Calculator
├── public/              # Generated site (gitignored)
├── design-tokens.json   # Shared design tokens (source of truth)
├── hugo.toml            # Hugo configuration
└── package.json         # Node dependencies and scripts
```

### Key Files

**Configuration:**
- `hugo.toml` - Site configuration, menus, params, markup settings
- `design-tokens.json` - Single source of truth for colors, spacing, fonts, etc.
- `package.json` - Node dependencies (Bootstrap, Sass)

**Templates:**
- `layouts/_default/baseof.html` - Base template with &lt;head&gt;, &lt;body&gt; structure
- `layouts/_default/single.html` - Single article template
- `layouts/_default/list.html` - Default list template
- `layouts/blog/list.html` - Blog list page (custom card layout)
- `layouts/faq/faq.html` - FAQ list page (filtered by tag)
- `layouts/partials/masthead.html` - Site header with navigation
- `layouts/partials/footer.html` - Site footer
- `layouts/partials/icon.html` - Icon rendering partial (Tabler Icons)

**Stylesheets:**
- `assets/css/tokens.css` - Auto-generated CSS custom properties (DO NOT EDIT)
- `assets/css/main.css` - Hugo-specific component styles
- `assets/scss/custom-bootstrap.scss` - Bootstrap customization
- `assets/css/bootstrap.css` - Generated from SCSS (DO NOT EDIT)

### Content Structure

All content is written in Markdown with YAML front matter.

**Blog Post Example:**
```yaml
---
title: "Article Title"
date: 2025-01-15
author: "Cardinality Cloud"
tags: ["prometheus", "slo", "monitoring"]
description: "SEO-friendly description for meta tags"
math: true  # Enable KaTeX for math rendering
---

Article content in Markdown...
```

**Front Matter Fields:**
- `title` - Article title (required)
- `date` - Publication date in YYYY-MM-DD format (required)
- `author` - Author name (optional, defaults to site author)
- `tags` - Array of tags for categorization and filtering
- `description` - Meta description for SEO (highly recommended)
- `summary` - Custom summary text (optional, overrides auto-generated summary)
- `math` - Set to `true` to enable KaTeX math rendering
- `draft` - Set to `true` to hide from production builds

**Summary Generation:**
- Hugo auto-generates summaries (~35 words by default, configured in `hugo.toml`)
- Use `summary:` front matter to provide custom teaser text
- Use `<!--more-->` comment in content to manually set summary cutoff point

### Template System

**Base Template (`baseof.html`):**
- Defines overall HTML structure
- Loads fonts, stylesheets, analytics
- Includes conditional KaTeX for pages with `math: true`
- Provides blocks: `title`, `head`, `main`, `scripts`

**Partials:**
- `masthead.html` - Renders site header and main navigation
- `footer.html` - Renders site footer with links and version info
- `icon.html` - Renders Tabler Icons as inline SVG
  - Usage: `{{ partial "icon.html" (dict "name" "calendar" "size" 16 "class" "icon-sm") }}`
- `structured-data.html` - JSON-LD structured data for SEO

**List Templates:**
- Display article cards with title, metadata, summary, tags
- Blog and FAQ use identical card structure with slight variations
- Include "Read More" links with arrow icons
- Support hover effects and responsive design

## Styling &amp; Theming

### Design System Overview

The Hugo site shares a design system with the React app via `design-tokens.json`. This ensures visual consistency across both platforms.

**Design Token Flow:**
```
design-tokens.json (source) → tokens.css (generated) → main.css (Hugo styles)
```

### Color Palette

**Brand Gradient:** `#667eea` → `#764ba2`
- Used for: page backgrounds, title text, buttons, accent colors
- CSS Variable: `--gradient-primary`

**Purple Scale (10 shades):**
```css
--color-purple-0: #f3f0ff  /* Lightest - backgrounds, info boxes */
--color-purple-1: #e5dbff  /* Very light - borders, hover states */
--color-purple-2: #d0bfff  /* Light */
--color-purple-3: #b197fc  /* Light-medium - hover borders */
--color-purple-4: #9775fa  /* Medium-light */
--color-purple-5: #667eea  /* Brand gradient start ⭐ */
--color-purple-6: #7265d4  /* Medium-dark */
--color-purple-7: #764ba2  /* Brand gradient end ⭐ - links, buttons */
--color-purple-8: #5f3a7d  /* Dark - text emphasis */
--color-purple-9: #4a2c5f  /* Darkest */
```

**Aliases:**
```css
--color-primary: #667eea      /* Shorthand for purple-5 */
--color-primary-dark: #764ba2 /* Shorthand for purple-7 */
```

### CSS Custom Properties

All design tokens are available as CSS custom properties in `:root`:

**Colors:**
- `--color-purple-{0-9}` - Purple color scale
- `--color-primary` - Primary brand color
- `--gradient-primary` - Brand gradient

**Typography:**
- `--font-family` - Fira Sans with fallbacks
- `--font-family-mono` - Fira Mono with fallbacks

**Spacing:**
- `--spacing-xs` - 0.625rem (10px)
- `--spacing-sm` - 0.75rem (12px)
- `--spacing-md` - 1rem (16px)
- `--spacing-lg` - 1.25rem (20px)
- `--spacing-xl` - 2rem (32px)

**Border Radius:**
- `--radius-xs` - 0.125rem
- `--radius-sm` - 0.25rem
- `--radius-md` - 0.5rem
- `--radius-lg` - 1rem
- `--radius-xl` - 2rem

**Box Shadows:**
- `--shadow-sm` - Subtle shadow (1px)
- `--shadow-md` - Medium shadow (4px)
- `--shadow-lg` - Large shadow (10px)

### Theme Usage Best Practices

**DO:**
- ✅ Use CSS custom properties: `color: var(--color-purple-7)`
- ✅ Use `--gradient-primary` for gradients
- ✅ Reference spacing variables: `margin: var(--spacing-md)`
- ✅ Update `design-tokens.json` to change design system
- ✅ Rebuild tokens.css after editing design-tokens.json
- ✅ Use semantic HTML elements (article, aside, nav, etc.)

**DON'T:**
- ❌ Hardcode hex colors like `#667eea` or `#764ba2`
- ❌ Hardcode `linear-gradient(...)` - use `var(--gradient-primary)`
- ❌ Edit `tokens.css` directly (it's auto-generated)
- ❌ Use blue colors (old theme) - use purple
- ❌ Hardcode spacing values - use spacing variables
- ❌ Use Bootstrap utility classes for colors (use CSS vars instead)

### Character Encoding

**All source files use 7-bit ASCII only:**
- Special characters use HTML entities (e.g., `&amp;copy;`, `&amp;bull;`, `&amp;larr;`, `&amp;rarr;`)
- Icons use Tabler Icons SVG files via `icon.html` partial
- Math symbols use KaTeX/LaTeX syntax
- No UTF-8 characters beyond ASCII range (no emoji, no special Unicode)

**Examples:**
- Copyright: `&amp;copy;` not `©`
- Bullet: `&amp;bull;` not `•`
- Left arrow: Use `{{ partial "icon.html" (dict "name" "arrow-left") }}` not `←`
- Right arrow: Use `{{ partial "icon.html" (dict "name" "arrow-right") }}` not `→`
- Math: Use `$$\int_0^T$$` not `∫₀ᵀ`
- Ampersand in HTML: `&amp;amp;` for literal `&amp;`

**Why ASCII-only?**
- Consistent rendering across all systems and editors
- No encoding issues with Git, editors, or build tools
- Explicit intent (HTML entities are self-documenting)
- SEO-friendly (search engines prefer HTML entities for special chars)

### Component Styling Patterns

**Paper Component:**
```css
.paper {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
}
```

**Blog Cards:**
```css
.blog-item {
  padding: var(--spacing-lg);
  border: 1px solid var(--color-purple-1);
  border-radius: var(--radius-md);
  background: white;
  transition: all 0.2s ease;
}

.blog-item:hover {
  border-color: var(--color-purple-3);
  box-shadow: var(--shadow-md);
}
```

**Links:**
```css
a {
  color: var(--color-purple-7);
  text-decoration: none;
}

a:hover {
  color: var(--color-primary);
}
```

### Responsive Design

Mobile breakpoints are defined in Bootstrap's SCSS:
- `sm`: 576px
- `md`: 768px
- `lg`: 992px
- `xl`: 1200px

**Common Patterns:**
```css
@media (max-width: 768px) {
  .masthead-title {
    font-size: 1.75rem; /* Smaller on mobile */
  }

  .blog-item {
    padding: var(--spacing-md); /* Reduced padding */
  }
}
```

## Content Management

### Creating New Blog Posts

1. Create a new Markdown file in `content/blog/`:
   ```bash
   hugo new blog/my-article-title.md
   ```

2. Edit front matter with title, date, tags, description

3. Write content in Markdown

4. Preview with `hugo server -D` (includes drafts)

5. Remove `draft: true` when ready to publish

### Creating New FAQ Articles

1. Create a new Markdown file in `content/faq/`:
   ```bash
   hugo new faq/my-faq-question.md
   ```

2. **Important:** Add `"faq"` tag to front matter:
   ```yaml
   tags: ["faq", "prometheus", "slo"]
   ```

3. FAQ list page filters by the `"faq"` tag, so it's required

### Using Math in Content

1. Add `math: true` to front matter

2. Use LaTeX syntax in Markdown:
   - Block math: `$$...$$`
   - Inline math: `$...$`

3. Example:
   ```markdown
   The error budget formula is:

   $$\text{Error Budget} = 1 - \text{SLO Target}$$
   ```

### Using Icons in Templates

```go
{{/* Calendar icon */}}
{{ partial "icon.html" (dict "name" "calendar" "size" 16 "class" "icon-sm") }}

{{/* Arrow right icon */}}
{{ partial "icon.html" (dict "name" "arrow-right" "size" 18) }}

{{/* Tag icon with custom size */}}
{{ partial "icon.html" (dict "name" "tag" "size" 12) }}
```

**Available Icons:**
- All Tabler Icons are available in `assets/icons/`
- Icon names match file names (without `.svg`)
- Default size: 18px
- Default class: `icon`

### URL Structure

```
/                       - Home page (redirects to /pag/)
/blog/                  - Blog list page
/blog/article-slug/     - Individual blog post
/faq/                   - FAQ list page
/faq/question-slug/     - Individual FAQ article
/pag/                   - Alert Generator (embedded React app)
/prc/                   - Resource Calculator (embedded React app)
/tags/tag-name/         - Articles tagged with "tag-name"
/terms/                 - Terms of service / privacy policy
```

## Integration with React Apps

The Hugo site embeds the React-based tools via static file hosting:

1. React apps are built separately (in parent directory)
2. Build output is copied to `static/pag/` and `static/prc/`
3. Hugo serves these as static files
4. Landing pages in `content/pag/` and `content/prc/` iframe the apps

**Why iframes?**
- Separate build processes (Hugo + Vite)
- Independent deployment
- Shared design tokens ensure visual consistency

## Deployment

**Build Process:**
1. Build React apps and copy to `static/pag/`, `static/prc/`
2. Run `npm run build:css` to compile Bootstrap SCSS
3. Run `hugo --minify` to build Hugo site
4. Deploy `public/` directory to hosting

**SEO Files:**
- `robots.txt` - In `static/` directory
- `sitemap.xml` - Auto-generated by Hugo
- `og-image.png` - Open Graph preview image (in `static/`)
- Structured data - Generated by `partials/structured-data.html`

**Environment Variables:**
- `HUGO_ENV=production` - Enables minification and fingerprinting
- Google Analytics configured in `hugo.toml`

## Common Tasks

### Update Design Tokens

1. Edit `design-tokens.json`
2. Regenerate `assets/css/tokens.css` (manually or via script)
3. Test changes with `hugo server`

### Add a New Icon

1. Download SVG from [Tabler Icons](https://tabler.io/icons)
2. Save to `assets/icons/icon-name.svg`
3. Use in templates: `{{ partial "icon.html" (dict "name" "icon-name") }}`

### Customize Bootstrap

1. Edit `assets/scss/custom-bootstrap.scss`
2. Run `npm run build:css` or `npm run watch:css`
3. Changes apply to all pages automatically

### Update Summary Length

Edit `hugo.toml`:
```toml
summaryLength = 35  # Words to show in blog/FAQ card summaries
```

## Hugo-Specific Conventions

### Front Matter Best Practices

- Use YAML format (not TOML or JSON)
- Always include `title` and `date`
- Add `description` for SEO (different from summary)
- Use lowercase tags: `["prometheus", "slo"]` not `["Prometheus", "SLO"]`
- Date format: `YYYY-MM-DD` (e.g., `2025-01-15`)

### Template Variables

Common Hugo variables used in templates:
- `.Title` - Page title
- `.Date` - Publication date
- `.Summary` - Auto-generated or manual summary
- `.Content` - Full page content
- `.Params.tags` - Front matter tags
- `.Params.author` - Front matter author
- `.RelPermalink` - Relative URL to page
- `.Site.Title` - Site title from config
- `.ReadingTime` - Estimated reading time in minutes

### Shortcodes

Create reusable content components in `layouts/shortcodes/`.

Example: `layouts/shortcodes/note.html`
```html
&lt;div class="info-box"&gt;
  {{ .Inner }}
&lt;/div&gt;
```

Usage in Markdown:
```markdown
{{&lt; note &gt;}}
This is an important note!
{{&lt; /note &gt;}}
```

## Key Concepts

### Static Site Generation

Hugo is a static site generator - it builds HTML files at build time:
- No server-side rendering
- Fast page loads
- Easy to host (any static file host)
- SEO-friendly (pre-rendered HTML)

### Design Token System

Design tokens ensure visual consistency between Hugo and React:
1. Single source of truth: `design-tokens.json`
2. Generated CSS custom properties: `tokens.css`
3. Both Hugo CSS and React use same color values
4. Update tokens once, applies everywhere

### Content Organization

- `content/` contains all Markdown files
- Hugo uses directory structure for URLs
- `_index.md` files define section landing pages
- Front matter controls rendering and metadata
- Tags create automatic taxonomies (tag pages)

## Troubleshooting

**CSS not updating:**
- Run `npm run build:css` to rebuild Bootstrap
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)

**Math not rendering:**
- Check `math: true` in front matter
- Ensure KaTeX CDN is loaded (check browser console)
- Verify LaTeX syntax is valid

**Icon not showing:**
- Check icon name matches file in `assets/icons/`
- Verify SVG file is valid
- Check browser console for errors

**Changes not visible:**
- Hugo caches aggressively - restart `hugo server`
- Check if file is in `content/` (not `static/`)
- Verify front matter `draft: false` (or use `hugo server -D`)
