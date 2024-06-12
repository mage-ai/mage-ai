import React, { Suspense, lazy, useContext, useMemo } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';

import Loading from '@mana/components/Loading';
import { AppLoaderProps, AppLoaderResultType } from '../interfaces';

export default function useApp({ app, addApp, removeApp }: AppLoaderProps): AppLoaderResultType {
  const themeContext = useContext(ThemeContext);
  const MateriaIDE = lazy(() => import('@components/v2/IDE'));

  console.log(app);
  const main = useMemo(
    () => (
      <Suspense
        fallback={
          <ThemeProvider theme={themeContext}>
            <div style={{ display: 'flex' }}>
              <Loading position="absolute" />
            </div>
          </ThemeProvider>
        }
      >
        <MateriaIDE
          configurations={app?.options?.configurations}
          file={app?.options?.file}
          uuid={app?.uuid}
        />
      </Suspense>
    ),
    [MateriaIDE, app, themeContext],
  );

  return {
    main,
  };
}
