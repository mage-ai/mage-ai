import React, { useMemo } from 'react';

import Button from '@mana/elements/Button';
import SystemBrowser from './System';
import TextInput from '@mana/elements/Input/TextInput';
import { AppConfigType, AppLoaderResultType } from '../interfaces';

export default function useBrowser(app: AppConfigType): AppLoaderResultType {
  const main = useMemo(() => <SystemBrowser app={app} />, [app]);
  const toolbarTop = useMemo(
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

        <TextInput basic monospace placeholder='/' small />
      </>
    ),
    [],
  );

  return {
    main,
    toolbars: {
      top: toolbarTop,
    },
  };
}
