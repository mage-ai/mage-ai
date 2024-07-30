import React from 'react';
import ThemeType from '@mana/themes/interfaces';
import { SetThemeSettingsType } from '@mana/themes/interfaces';
import { APIMutationProvider } from './APIMutation';
import { LayoutProvider } from './Layout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { TooltipProvider } from './Tooltip';
import { getTheme } from '@mana/themes/utils';

function ContextProvider({
  base = false,
  children,
  main,
  router,
  theme,
  updateThemeSettings,
}: {
  base?: boolean
  children: React.ReactNode;
  main?: boolean;
  router?: any;
  theme?: ThemeType;
  updateThemeSettings?: SetThemeSettingsType;
}) {
  const queryClient = new QueryClient();

  return (
    <ThemeProvider theme={theme ?? getTheme()}>
      <LayoutProvider router={router} theme={theme} updateThemeSettings={updateThemeSettings}>
        <QueryClientProvider client={queryClient}>
          <APIMutationProvider base={base}>
            <TooltipProvider main={main}>{children}</TooltipProvider>
          </APIMutationProvider>
        </QueryClientProvider>
      </LayoutProvider>
    </ThemeProvider>
  );
}

export default ContextProvider;
