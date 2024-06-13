import React, { useMemo } from 'react';

import Button from '@mana/elements/Button';
import SystemBrowser from './System';
import TextInput from '@mana/elements/Input/TextInput';
import { AppLoaderProps, AppLoaderResultType } from '../interfaces';

export default function useApp({ app, addApp, removeApp }: AppLoaderProps): AppLoaderResultType {
  const main = useMemo(
    () => <SystemBrowser addApp={addApp} app={app} removeApp={removeApp} />,
    [addApp, app, removeApp],
  );

  const top = useMemo(
    () => (
      <>
        <Button
          onClick={() => {
            console.log('browse');
          }}
          small
        >
          Browse
        </Button>

        <TextInput basic monospace placeholder="/" small />
      </>
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
