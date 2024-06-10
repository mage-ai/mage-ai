import React, { useContext } from 'react';

export type DisableGlobalKeyboardShortcuts = {
  setDisableGlobalKeyboardShortcuts?: (
    disableGlobalKeyboardShortcuts: boolean,
    opts?: {
      keyMapping?: {
        [keyCode: number | string]: boolean;
      };
      uuidMapping?: {
        [keyCode: number | string]: boolean;
      };
    },
  ) => void;
};

export type KeyboardRegisterType = {
  registerOnKeyDown: (
    uuid: string,
    onKeyDown: (
      event: any,
      keyMapping: {
        [key: string]: boolean;
      },
      keyHistory: number[],
    ) => void,
    dependencies: any[],
  ) => void;
  registerOnKeyUp: (
    uuid: string,
    onKeyDown: (
      event: any,
      keyMapping: {
        [key: string]: boolean;
      },
      keyHistory: number[],
      newMapping: {
        [key: string]: boolean;
      },
    ) => void,
    dependencies: any[],
  ) => void;
};

type KeyboardContextType = {
  disableGlobalKeyboardShortcuts?: boolean;
  unregisterOnKeyDown: (uuid: string) => void;
  unregisterOnKeyUp: (uuid: string) => void;
} & KeyboardRegisterType &
  DisableGlobalKeyboardShortcuts;

const KeyboardContext = React.createContext<KeyboardContextType>({
  disableGlobalKeyboardShortcuts: false,
  registerOnKeyDown: null,
  registerOnKeyUp: null,
  setDisableGlobalKeyboardShortcuts: () => null,
  unregisterOnKeyDown: null,
  unregisterOnKeyUp: null,
});

export const useKeyboardContext = () => useContext(KeyboardContext);

export default KeyboardContext;
