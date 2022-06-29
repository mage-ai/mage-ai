import * as React from 'react';

export type SheetProps = {
  enterFromBottom?: boolean;
  enterFromLeft?: boolean;
  enterFromRight?: boolean;
  maxHeight?: number;
  maxWidth?: number;
};

export type SheetType = React.FunctionComponent<any>;
export type SheetObjectType = {
  component: SheetType;
  hideSheet: (key: string) => void;
  hideSheetCallback?: () => void;
  sheetProps: SheetProps;
  visible: boolean;
};

export type UseSheetOptionsType = {
  hideSheetCallback?: () => void;
};

export interface SheetContextType {
  hideSheet(key: string, opts?: UseSheetOptionsType): void;
  showSheet(
    key: string,
    component: SheetType,
    hideSheet: (key: string) => void,
    sheetProps: SheetProps,
    opts?: UseSheetOptionsType,
  ): void;
}

const invariantViolation = () => {
  throw new Error(
    'Attempted to call useSheet outside of sheet context. ' +
    'Make sure your app is rendered inside SheetProvider.'
  );
};

export const SheetContext = React.createContext<SheetContextType>({
  hideSheet: invariantViolation,
  showSheet: invariantViolation,
});

SheetContext.displayName = 'SheetContext';
