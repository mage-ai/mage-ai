import * as React from 'react';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  SheetContext,
  SheetObjectType,
  SheetProps,
  SheetType,
  UseSheetOptionsType,
} from './SheetContext';
import { SheetRoot } from './SheetRoot';
import { hideSheets } from './utils';

export interface SheetProviderProps {
  children: React.ReactNode;
  container?: Element;
  rootComponent?: React.ComponentType<any>;
}

export const SheetProvider = ({
  container,
  rootComponent,
  children
}: SheetProviderProps) => {
  if (container && !(container instanceof HTMLElement)) {
    throw new Error(`
      Container must specify DOM element to mount sheet root into.
      This behavior has changed in 3.0.0. Please use \`rootComponent\` prop instead.
    `);
  }
  const [sheets, setSheets] = useState<Record<string, SheetObjectType>>();

  const hideSheet = useCallback(
    (
      key: string,
      opts?: UseSheetOptionsType,
    ) => setSheets(sheets => hideSheets(key, sheets, opts)),
    [],
  );

  const showSheet = useCallback((
    key: string,
    sheet: SheetType,
    hideSheet: (key: string) => void,
    sheetProps: SheetProps,
    opts?: UseSheetOptionsType,
  ) => setSheets(sheets => ({
    ...sheets,
    [key]: {
      ...opts,
      component: sheet,
      hideSheet,
      sheetProps,
      visible: true,
    },
  })), []);

  const contextValue = useMemo(() => ({ showSheet, hideSheet }), [hideSheet, showSheet]);

  return (
    <SheetContext.Provider value={contextValue}>
      <>
        {children}
        <SheetRoot
          component={rootComponent}
          container={container}
          sheets={sheets}
        />
      </>
    </SheetContext.Provider>
  );
};
