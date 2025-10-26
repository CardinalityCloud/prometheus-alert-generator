import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import PrometheusRuleGenerator from './prometheus-rule-generator.tsx';
import { Faq } from './Faq.tsx';
import { ResourceCalculator } from './ResourceCalculator.tsx';
import { NotFound } from './NotFound.tsx';
import { theme } from './theme.ts';

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PrometheusRuleGenerator />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/resources" element={<ResourceCalculator />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
