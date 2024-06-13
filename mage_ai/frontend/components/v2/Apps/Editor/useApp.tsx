import React, { Suspense, lazy, useContext, useMemo } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Loading from '@mana/components/Loading';
import { AppLoaderProps, AppLoaderResultType } from '../interfaces';
import { Save, Trash, Add, PlayButtonFilled } from '@mana/icons';
import KeyboardTextGroup from '@mana/elements/Text/Keyboard/Group';
import { KEY_SYMBOL_META, KEY_SYMBOL_ENTER } from '@utils/hooks/keyboardShortcuts/constants';

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
          Icon={Add}
          onClick={() => {
            console.log('browse');
          }}
          primary
          small
        >
          New file
        </Button>
        <Button
          Icon={Save}
          onClick={() => {
            console.log('browse');
          }}
          small
        >
          Save
        </Button>
        <Button
          Icon={Trash}
          basic
          onClick={() => {
            console.log('browse');
          }}
          small
        >
          Delete
        </Button>
        <Button
          Icon={PlayButtonFilled}
          basic
          onClick={() => {
            console.log('browse');
          }}
          secondary
          small
          tag={
            <KeyboardTextGroup
              inverted
              monospace
              textGroup={[[KEY_SYMBOL_META, KEY_SYMBOL_ENTER]]}
              xsmall
            />
          }
        >
          Run
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
