import React, { Suspense, lazy, useContext, useMemo } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Loading from '@mana/components/Loading';
import { AppLoaderProps, AppLoaderResultType } from '../interfaces';

export default function useApp({ app, addApp, removeApp }: AppLoaderProps): AppLoaderResultType {
  const themeContext = useContext(ThemeContext);
  const EditorApp = lazy(() => import('./index'));

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
        <EditorApp addApp={addApp} app={app} removeApp={removeApp} />
      </Suspense>
    ),
    [EditorApp, app, addApp, removeApp, themeContext],
  );

  const top = useMemo(
    () => (
      <ButtonGroup>
        <Button
          onClick={() => {
            console.log('browse');
          }}
          secondary
          small
        >
          New
        </Button>
        <Button
          onClick={() => {
            console.log('browse');
          }}
          primary
          small
        >
          Save
        </Button>
        <Button
          basic
          onClick={() => {
            console.log('browse');
          }}
          small
        >
          Delete
        </Button>
      </ButtonGroup>
    ),
    [],
  );

  return {
    main,
    toolbars: {
      top,
    },
  };
}
