import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';

import { AppLoaderProps, AppLoaderResultType } from '../interfaces';

const SystemBrowser = dynamic(() => import('./System'), { ssr: false });
const ToolbarsTop = dynamic(() => import('./System/Toolbars/Top'), { ssr: false });

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
