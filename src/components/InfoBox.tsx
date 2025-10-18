import { Paper, useMantineTheme } from '@mantine/core';
import type { PaperProps, MantineColor } from '@mantine/core';

export interface InfoBoxProps extends PaperProps {
  /** Color from theme (defaults to primary) */
  color?: MantineColor;
  /** Variant for future use (currently only 'info' is implemented) */
  variant?: 'info' | 'success' | 'warning' | 'error';
  /** Children elements */
  children?: React.ReactNode;
}

/**
 * InfoBox - A consistent styled Paper component for displaying important information
 *
 * Usage:
 * ```tsx
 * <InfoBox>
 *   <Text>Your content here</Text>
 * </InfoBox>
 * ```
 */
export function InfoBox({
  color,
  variant = 'info',
  children,
  style,
  ...props
}: InfoBoxProps) {
  const theme = useMantineTheme();

  // Use primary color if no color specified
  const effectiveColor = color || theme.primaryColor;

  // Get color shades from theme
  const backgroundColor = theme.colors[effectiveColor][0]; // Lightest
  const borderColor = theme.colors[effectiveColor][5]; // Medium (brand color)

  return (
    <Paper
      p="md"
      withBorder
      style={{
        backgroundColor,
        borderColor,
        ...style,
      }}
      {...props}
    >
      {children}
    </Paper>
  );
}
