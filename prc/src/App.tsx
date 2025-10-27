// Only import Bootstrap in dev mode - production uses Hugo's custom Bootstrap
if (import.meta.env.DEV) {
  import('bootstrap/dist/css/bootstrap.min.css');
}

import { ResourceCalculator } from './ResourceCalculator.tsx';

export default function App() {
  return <ResourceCalculator />;
}
