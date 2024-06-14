import React, { useMemo } from 'react';

import Button from '@mana/elements/Button';
import SystemBrowser from './System';
import TextInput from '@mana/elements/Input/TextInput';
import { AppLoaderProps, AppLoaderResultType } from '../interfaces';

export default function useApp(props: AppLoaderProps): AppLoaderResultType {
  const main = useMemo(
    () => <SystemBrowser {...props} />,
    [props],
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
    [props],
  );

  return {
    main,
    toolbars: {
      top,
    },
  };
}
