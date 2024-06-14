import React, { Suspense, lazy, useContext, useMemo } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import dynamic from 'next/dynamic';
import Button, { ButtonGroup } from '@mana/elements/Button';
import Loading from '@mana/components/Loading';
import { AppLoaderProps, AppLoaderResultType } from '../interfaces';
import { Save, Trash, Add, PlayButtonFilled } from '@mana/icons';
import KeyboardTextGroup from '@mana/elements/Text/Keyboard/Group';
import { KEY_SYMBOL_META, KEY_SYMBOL_ENTER } from '@utils/hooks/keyboardShortcuts/constants';

const ToolbarsTop = dynamic(() => import('./Toolbars/Top'));

export default function useApp(props: AppLoaderProps): AppLoaderResultType {
  const themeContext = useContext(ThemeContext);
  const EditorApp = lazy(() => import('./index'));

  const main = useMemo(
    () => (
      <Suspense
        fallback={
          <ThemeProvider theme={themeContext}>
            <div style={{ display: 'flex' }}>
              <Loading position='absolute' />
            </div>
          </ThemeProvider>
        }
      >
        <EditorApp {...props} />
      </Suspense>
    ),
    [EditorApp, themeContext, props],
  );

  const top = useMemo(() => <ToolbarsTop {...props} />, [props]);

  return {
    main,
    toolbars: {
      top,
    },
  };
}
