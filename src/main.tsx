import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PrometheusRuleGenerator from './prometheus-rule-generator.tsx';
//import './index.css';
import '@mantine/core/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <PrometheusRuleGenerator />
  </StrictMode>
);
