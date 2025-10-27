import { Card } from 'react-bootstrap';
import type { CSSProperties, ReactNode } from 'react';

export interface InfoBoxProps {
  /** Variant for styling */
  variant?: 'info' | 'success' | 'warning' | 'error';
  /** Children elements */
  children?: ReactNode;
  /** Additional styles */
  style?: CSSProperties;
  /** Additional className */
  className?: string;
}

/**
 * InfoBox - A consistent styled Card component for displaying important information
 *
 * Usage:
 * ```tsx
 * <InfoBox>
 *   <div>Your content here</div>
 * </InfoBox>
 * ```
 */
export function InfoBox({
  variant = 'info',
  children,
  style,
  className = '',
  ...props
}: InfoBoxProps) {
  // Map variant to Bootstrap border color
  const borderVariant = {
    'info': 'primary',
    'success': 'success',
    'warning': 'warning',
    'error': 'danger'
  }[variant];

  return (
    <Card
      border={borderVariant}
      className={`bg-light ${className}`}
      style={{ ...style }}
      {...props}
    >
      <Card.Body>
        {children}
      </Card.Body>
    </Card>
  );
}
