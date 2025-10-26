import { Paper, Group, Text } from '@mantine/core';
import { IconExternalLink, IconBrandGithub, IconBug, IconQuestionMark, IconNews, IconMail } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <Paper
      p="xl"
      radius="lg"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
      }}
    >
      {/* Links */}
      <Group justify="center" gap="xl" style={{ marginBottom: '1rem' }}>
        <a
          href="https://cardinality.cloud/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#667eea',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
          }}
        >
          <IconExternalLink size={18} />
          <span>Cardinality Cloud</span>
        </a>

        <a
          href="https://github.com/CardinalityCloud/prometheus-alert-generator"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#667eea',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
          }}
        >
          <IconBrandGithub size={18} />
          <span>GitHub</span>
        </a>

        <a
          href="https://github.com/CardinalityCloud/prometheus-alert-generator/issues"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#667eea',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
          }}
        >
          <IconBug size={18} />
          <span>Report Issues</span>
        </a>

        <Link
          to="/faq"
          style={{
            color: '#667eea',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
          }}
        >
          <IconQuestionMark size={18} />
          <span>FAQ</span>
        </Link>

        <a
          href="https://cardinality.cloud/blog/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#667eea',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
          }}
        >
          <IconNews size={18} />
          <span>Blog</span>
        </a>

        <a
          href="mailto:jjneely@cardinality.cloud?subject=Prometheus Alert Generator Feedback"
          style={{
            color: '#667eea',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
          }}
        >
          <IconMail size={18} />
          <span>Send Feedback</span>
        </a>
      </Group>

      {/* Copyright */}
      <Text size="sm" c="dimmed" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        &copy; 2025 Cardinality Cloud, LLC. Licensed under Apache 2.0.
      </Text>

      {/* Version Info */}
      <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
        v{__APP_VERSION__} (
        <a
          href={`https://github.com/CardinalityCloud/prometheus-alert-generator/commit/${__GIT_COMMIT_SHA__}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          {__GIT_COMMIT_SHA__}
        </a>
        ) &bull; Built: {new Date(__BUILD_DATE__).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      </Text>
    </Paper>
  );
}
