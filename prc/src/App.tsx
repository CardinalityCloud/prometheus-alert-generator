import { MantineProvider } from '@mantine/core';
import { ResourceCalculator } from './ResourceCalculator.tsx';

export default function App() {
  return (
    <MantineProvider>
      <ResourceCalculator />
    </MantineProvider>
  );
}
