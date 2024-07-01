import React from 'react';
import ThemeType from '@mana/themes/interfaces';
import { APIMutationProvider } from '../APIMutation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { TooltipProvider } from '../Tooltip';

function ContextProvider({ children, theme }: { children: React.ReactNode, theme: ThemeType }) {
  const queryClient = new QueryClient();

  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <APIMutationProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </APIMutationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default ContextProvider;