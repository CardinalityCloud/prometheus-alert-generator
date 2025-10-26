import { Container, Title, Text, Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { theme } from './theme';

export function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: theme.other!.gradients.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <Container size="sm" style={{
        maxWidth: '600px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
        borderRadius: '1rem',
        padding: '3rem',
        textAlign: 'center',
        boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
      }}>
        <Title
          style={{
            fontSize: '8rem',
            fontWeight: 700,
            background: theme.other!.gradients.primary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
            marginBottom: '1rem',
          }}
        >
          404
        </Title>

        <div style={{
          width: '200px',
          height: '200px',
          margin: '0 auto 2rem',
        }}>
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(100, 100)">
              <circle cx="0" cy="0" r="85" fill="#667eea" opacity="0.1"/>
              <circle cx="0" cy="0" r="70" fill="#764ba2" opacity="0.15"/>
              <path d="M 0,-50 L 43,35 L -43,35 Z" fill="none" stroke="#667eea" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="0" y1="-20" x2="0" y2="10" stroke="#764ba2" strokeWidth="6" strokeLinecap="round"/>
              <circle cx="0" cy="22" r="4" fill="#764ba2"/>
            </g>
            <circle cx="30" cy="30" r="3" fill="#667eea" opacity="0.6">
              <animate attributeName="cy" values="30;25;30" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="170" cy="50" r="2" fill="#764ba2" opacity="0.5">
              <animate attributeName="cy" values="50;45;50" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="160" cy="160" r="3" fill="#667eea" opacity="0.4">
              <animate attributeName="cy" values="160;155;160" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="40" cy="170" r="2" fill="#764ba2" opacity="0.6">
              <animate attributeName="cy" values="170;165;170" dur="2.2s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>

        <Title order={1} style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          Page Not Found
        </Title>

        <Text size="lg" c="dimmed" style={{ marginBottom: '2rem', lineHeight: 1.6 }}>
          Oops! The page you're looking for doesn't exist.
          It may have been moved or deleted.
        </Text>

        <Button
          component={Link}
          to="/"
          size="lg"
          leftSection={<IconArrowLeft size={18} />}
          style={{
            background: theme.other!.gradients.primary,
            boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)',
          }}
        >
          Back to Generator
        </Button>
      </Container>
    </div>
  );
}
