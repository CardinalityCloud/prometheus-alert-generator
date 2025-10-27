import { Card } from 'react-bootstrap';

export interface InfoBoxProps {
  /** Variant for Bootstrap styling */
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary';
  /** Children elements */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
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
  className,
  style,
}: InfoBoxProps) {
  return (
    <Card
      border={variant}
      className={className}
      style={style}
    >
      <Card.Body>
        {children}
      </Card.Body>
    </Card>
  );
}
