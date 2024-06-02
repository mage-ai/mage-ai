import { ScreenClassProvider, setConfiguration } from 'react-grid-system';
import { gridSystemConfiguration } from '@mana/themes/grid';

function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('Using Pro...');
  setConfiguration(gridSystemConfiguration());
  return (
    <ScreenClassProvider>
      {children}
    </ScreenClassProvider>
  );
}

export default ProLayout;
