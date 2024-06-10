import React, { Suspense, lazy, useContext } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';

import Loading from '@mana/components/Loading';
import { AppConfigType } from '@components/v2/Apps/interfaces';

type EditorProps = {
  app: AppConfigType;
};

function EditorApp({ app }: EditorProps) {
  const themeContext = useContext(ThemeContext);
  const MateriaIDE = lazy(() => import('@components/v2/IDE'));

  return (
    <Suspense
      fallback={
        <ThemeProvider theme={themeContext}>
          <div style={{ display: 'flex' }}>
            <Loading position="absolute" />
          </div>
        </ThemeProvider>
      }
    >
      <MateriaIDE uuid={app?.uuid} />
    </Suspense>
  );
}

export default EditorApp;
