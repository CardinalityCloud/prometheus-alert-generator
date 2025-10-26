# Shared Design Tokens

This directory contains the design tokens that ensure visual consistency between Hugo static pages and React/Mantine tools.

## Files

- **`design-tokens.json`** - Single source of truth for all design values (colors, fonts, spacing, etc.)
- **`generate-css.js`** - Script that generates CSS and SCSS from the JSON tokens
- **`build/tokens.css`** - Auto-generated CSS custom properties (for Hugo and React)
- **`build/tokens.scss`** - Auto-generated SCSS variables and maps (for Hugo themes with SCSS)

## Usage

### Generating CSS/SCSS Files

After modifying `design-tokens.json`, regenerate the CSS/SCSS files:

```bash
node shared/generate-css.js
```

This creates:
- `shared/build/tokens.css` - CSS custom properties
- `shared/build/tokens.scss` - SCSS variables

### Using in Hugo

Add the generated CSS to your Hugo templates:

```html
<!-- hugo-site/layouts/partials/head.html -->
<link rel="stylesheet" href="/css/tokens.css">
```

Then use the CSS variables in your stylesheets:

```css
.my-element {
  color: var(--color-purple-8);
  background: var(--gradient-primary);
  font-family: var(--font-family);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
```

Or import the SCSS file:

```scss
@import '../../../shared/build/tokens';

.my-element {
  color: $color-purple-8;
  background: $gradient-primary;
  font-family: $font-family;
}
```

### Using in React/Mantine

Import the tokens directly in your theme:

```typescript
import tokens from '../shared/design-tokens.json';
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  fontFamily: tokens.fonts.family,
  fontFamilyMonospace: tokens.fonts.familyMonospace,
  colors: {
    purple: Object.values(tokens.colors.purple),
  },
  // ... etc
});
```

Or load the CSS file in your HTML:

```html
<!-- public/index.html -->
<link rel="stylesheet" href="/tokens.css">
```

## Token Categories

### Colors

- **Purple Palette** (`colors.purple`): 10-shade palette from lightest to darkest
  - `purple[0]`: `#f3f0ff` (InfoBox backgrounds)
  - `purple[5]`: `#667eea` (Brand gradient start)
  - `purple[7]`: `#764ba2` (Brand gradient end)
  - `purple[8]`: `#5f3a7d` (Text emphasis)

### Gradients

- **Primary** (`gradients.primary`): `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

### Typography

- **Font Family** (`fonts.family`): Fira Sans with system font fallbacks
- **Monospace** (`fonts.familyMonospace`): Fira Mono with monospace fallbacks

### Spacing

Standard Mantine spacing scale:
- `xs`: 0.625rem (10px)
- `sm`: 0.75rem (12px)
- `md`: 1rem (16px)
- `lg`: 1.25rem (20px)
- `xl`: 2rem (32px)

### Border Radius

Standard Mantine radius scale:
- `xs`: 0.125rem (2px)
- `sm`: 0.25rem (4px)
- `md`: 0.5rem (8px)
- `lg`: 1rem (16px)
- `xl`: 2rem (32px)

### Shadows

- `sm`: Subtle shadow for cards
- `md`: Medium shadow for elevated elements
- `lg`: Large shadow for modals/dropdowns

## Best Practices

1. **Never hardcode values** - Always use tokens instead of literal colors/sizes
2. **Update tokens first** - Modify `design-tokens.json`, then regenerate CSS/SCSS
3. **Keep in sync** - Run `generate-css.js` as part of your build process
4. **Use CSS variables** - Allows runtime theme switching if needed
5. **Document changes** - If adding new tokens, update this README

## Build Integration

Add to your build scripts:

```json
{
  "scripts": {
    "tokens:generate": "node shared/generate-css.js",
    "prebuild": "npm run tokens:generate"
  }
}
```

This ensures tokens are always up-to-date before building.
