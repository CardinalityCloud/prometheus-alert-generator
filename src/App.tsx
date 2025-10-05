import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import PrometheusRuleGenerator from './prometheus-rule-generator.tsx';
import { Faq } from './Faq.tsx';
import { NotFound } from './NotFound.tsx';

export default function App() {
  return (
    <MantineProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PrometheusRuleGenerator />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
