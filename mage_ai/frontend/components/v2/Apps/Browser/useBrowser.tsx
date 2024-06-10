import React, { Suspense, lazy, useMemo } from 'react';

import Button from '@mana/elements/Button';
import TextInput from '@mana/elements/Input/TextInput';
import Grid from '@mana/components/Grid';
import { AppConfigType } from '../interfaces';
import SystemBrowser from './System';

type BrowserProps = {
  app: AppConfigType;
};

type BrowserType = {
  main: JSX.Element;
  toolbars: {
    top: JSX.Element;
  };
};

export default function useBrowser({ app }: BrowserProps): BrowserType {
  const toolbarTop = useMemo(
    () => (
      <Grid templateColumns='auto 1fr' templateRows='min-content'>
        <Button
          onClick={() => {
            console.log('browse');
          }}
          small
        >
          Browse
        </Button>

        <TextInput basic monospace placeholder='/' small />
      </Grid>
    ),
    [],
  );

  const main = useMemo(() => <SystemBrowser app={app} />, [app]);

  return {
    main,
    toolbars: {
      top: toolbarTop,
    },
  };
}
