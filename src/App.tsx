import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import PrometheusRuleGenerator from './prometheus-rule-generator.tsx';
import { Faq } from './Faq.tsx';

export default function App() {
  return (
    <MantineProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PrometheusRuleGenerator />} />
          <Route path="/faq" element={<Faq />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
