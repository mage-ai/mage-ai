import React from 'react';
import ThemeType from '@mana/themes/interfaces';
import { APIMutationProvider } from '../APIMutation';
import { LayoutProvider } from '@context/v2/Layout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { TooltipProvider } from '../Tooltip';

function ContextProvider({
  children,
  main,
  router,
  theme,
}: {
  children: React.ReactNode;
  main?: boolean;
  router?: any;
  theme: ThemeType;
}) {
  const queryClient = new QueryClient();

  return (
    <ThemeProvider theme={theme}>
      <LayoutProvider router={router} theme={theme}>
        <QueryClientProvider client={queryClient}>
          <APIMutationProvider>
            <TooltipProvider main={main}>{children}</TooltipProvider>
          </APIMutationProvider>
        </QueryClientProvider>
      </LayoutProvider>
    </ThemeProvider>
  );
}

export default ContextProvider;
