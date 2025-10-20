import { createTheme } from '@mantine/core';
import type { MantineColorsTuple } from '@mantine/core';

const purpleColor: MantineColorsTuple = [
  '#f3f0ff', // 0 - Lightest (for InfoBox backgrounds)
  '#e5dbff', // 1 - Very light
  '#d0bfff', // 2 - Light
  '#b197fc', // 3 - Light-medium
  '#9775fa', // 4 - Medium-light
  '#667eea', // 5 - Brand gradient start
  '#7265d4', // 6 - Medium-dark (blend)
  '#764ba2', // 7 - Brand gradient end
  '#5f3a7d', // 8 - Very dark (for text)
  '#4a2c5f', // 9 - Darkest
];

export const theme = createTheme({
  fontFamily: '"Fira Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: '"Fira Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  primaryColor: 'purple',
  defaultRadius: 'md',
  colors: {
    purple: purpleColor,
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
  other: {
    gradients: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            borderColor: '#667eea',
          },
        },
      },
    },
  },
});
