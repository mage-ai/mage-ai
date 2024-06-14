import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';

import Button from '@mana/elements/Button';
import SystemBrowser from './System';
import TextInput from '@mana/elements/Input/TextInput';
import { AppLoaderProps, AppLoaderResultType } from '../interfaces';

const ToolbarsTop = dynamic(() => import('./Toolbars/Top'));

export default function useApp(props: AppLoaderProps): AppLoaderResultType {
  const main = useMemo(() => <SystemBrowser {...props} />, [props]);

  const top = useMemo(() => <ToolbarsTop {...props} />, [props]);

  return {
    main,
    toolbars: {
      top,
    },
  };
}
