import { Paper, Title, Text, Group, Button } from '@mantine/core';
import { IconQuestionMark, IconChartBar } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { theme } from '../theme';

interface MastheadProps {
  title: string;
  subtitle: string;
  showAlertGeneratorButton?: boolean;
  showResourceCalculatorButton?: boolean;
  showFaqButton?: boolean;
}

export function Masthead({
  title,
  subtitle,
  showAlertGeneratorButton = false,
  showResourceCalculatorButton = false,
  showFaqButton = true
}: MastheadProps) {
  return (
    <Paper
      p="xl"
      radius="lg"
      style={{
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <Title
          order={1}
          mb="xs"
          style={{
            background: theme.other!.gradients.primary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '2.5rem',
            fontWeight: 700,
          }}
        >
          {title}
        </Title>
        <Text c="dimmed" size="lg">{subtitle}</Text>
        <Group justify="center" mt="md" mb="xs">
          {showAlertGeneratorButton && (
            <Button component={Link} to="/" variant="light" leftSection={<IconChartBar size={18} />}>
              Alert Generator
            </Button>
          )}
          {showResourceCalculatorButton && (
            <Button component={Link} to="/resources" variant="light" leftSection={<IconChartBar size={18} />}>
              Resource Calculator
            </Button>
          )}
          {showFaqButton && (
            <Button component={Link} to="/faq" variant="light" leftSection={<IconQuestionMark size={18} />}>
              FAQ
            </Button>
          )}
        </Group>
        <Text size="sm" c="dimmed" style={{ fontWeight: 500 }}>
          Brought to you by <a href="https://cardinality.cloud/" target="_blank" rel="noopener noreferrer" style={{ color: theme.colors!.purple![5], textDecoration: 'none', fontWeight: 600 }}>Cardinality Cloud, LLC</a>.
        </Text>
      </div>
    </Paper>
  );
}
