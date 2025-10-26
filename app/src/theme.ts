import { createTheme } from '@mantine/core';
import type { MantineColorsTuple } from '@mantine/core';
import tokens from '../../shared/design-tokens.json';

// Convert design tokens to Mantine color tuple
const purpleColor: MantineColorsTuple = [
  tokens.colors.purple['0'], // 0 - Lightest (for InfoBox backgrounds)
  tokens.colors.purple['1'], // 1 - Very light
  tokens.colors.purple['2'], // 2 - Light
  tokens.colors.purple['3'], // 3 - Light-medium
  tokens.colors.purple['4'], // 4 - Medium-light
  tokens.colors.purple['5'], // 5 - Brand gradient start
  tokens.colors.purple['6'], // 6 - Medium-dark (blend)
  tokens.colors.purple['7'], // 7 - Brand gradient end
  tokens.colors.purple['8'], // 8 - Very dark (for text)
  tokens.colors.purple['9'], // 9 - Darkest
];

export const theme = createTheme({
  fontFamily: tokens.fonts.family,
  fontFamilyMonospace: tokens.fonts.familyMonospace,
  primaryColor: 'purple',
  defaultRadius: 'md',
  colors: {
    purple: purpleColor,
  },
  shadows: {
    sm: tokens.shadows.sm,
    md: tokens.shadows.md,
    lg: tokens.shadows.lg,
  },
  other: {
    gradients: {
      primary: tokens.gradients.primary,
    },
  },
  components: {
    Paper: {
      defaultProps: {
        shadow: 'sm',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      styles: {
        input: {
          '&:focus': {
            borderColor: tokens.colors.purple['5'],
          },
        },
      },
    },
  },
});
