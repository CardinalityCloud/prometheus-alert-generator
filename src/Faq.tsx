import { Container, Title, Accordion, Paper, Group, Anchor } from '@mantine/core';
import { IconBrandGithub, IconBug, IconMail, IconQuestionMark } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import { faqItems } from './faq-content';

const iconMap = {
  github: IconBrandGithub,
  bug: IconBug,
  mail: IconMail,
  help: IconQuestionMark,
};

export function Faq() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      paddingTop: '2rem',
      paddingBottom: '4rem'
    }}>
      <Container size="md">
        <Paper
          shadow="sm"
          p="xl"
          radius="lg"
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Title
            order={1}
            style={{
              marginBottom: '2rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '2.5rem',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            Frequently Asked Questions
          </Title>

          <Accordion variant="separated">
            {faqItems.map((item) => {
              const Icon = item.icon ? iconMap[item.icon] : IconQuestionMark;
              return (
                <Accordion.Item key={item.id} value={item.id}>
                  <Accordion.Control>
                    <Group gap="sm">
                      <Icon size={20} />
                      <span style={{ fontWeight: 500 }}>{item.question}</span>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => (
                          <Anchor {...props} target="_blank" rel="noopener noreferrer" />
                        ),
                        p: ({ node, ...props }) => (
                          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }} {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul style={{ marginTop: '0.5rem', fontSize: '0.875rem' }} {...props} />
                        ),
                      }}
                    >
                      {item.answer}
                    </ReactMarkdown>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>

          <Group style={{ marginTop: '3rem', justifyContent: 'center' }}>
            <Anchor href="/" size="sm">
              ← Back to Generator
            </Anchor>
          </Group>
        </Paper>
      </Container>
    </div>
  );
}
