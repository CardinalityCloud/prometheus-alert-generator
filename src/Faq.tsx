import { Container, Accordion, Paper, Group, Anchor, Stack } from '@mantine/core';
import { IconBrandGithub, IconBug, IconMail, IconQuestionMark } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { faqItems } from './faq-content';
import { Masthead } from './components/Masthead';
import { Footer } from './components/Footer';
import { theme } from './theme';

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
      background: theme.other!.gradients.primary,
      paddingTop: '2rem',
      paddingBottom: '4rem'
    }}>
      <Container size="lg">
        <Stack gap="lg">
          <Masthead
            title="Frequently Asked Questions"
            subtitle="Learn more about Prometheus alerting, SLOs, and how to use our tools."
            showAlertGeneratorButton={true}
            showResourceCalculatorButton={true}
            showFaqButton={false}
          />

          <Paper
            shadow="md"
            p="xl"
            withBorder
            radius="lg"
            style={{
              background: 'white',
            }}
          >
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
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
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
                Back to Generator
              </Anchor>
            </Group>
          </Paper>

          <Footer />
        </Stack>
      </Container>
    </div>
  );
}
