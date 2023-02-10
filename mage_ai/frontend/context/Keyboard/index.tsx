import React, { useContext } from 'react';

type KeyboardContextType = {
  disableGlobalKeyboardShortcuts?: boolean;
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
  setDisableGlobalKeyboardShortcuts?: (
    disableGlobalKeyboardShortcuts: boolean)
   => void;
  unregisterOnKeyDown: (uuid: string) => void;
  unregisterOnKeyUp: (uuid: string) => void;
};

const KeyboardContext = React.createContext<KeyboardContextType>({
  disableGlobalKeyboardShortcuts: false,
  registerOnKeyDown: null,
  registerOnKeyUp: null,
  setDisableGlobalKeyboardShortcuts: () => {},
  unregisterOnKeyDown: null,
  unregisterOnKeyUp: null,
});

export const useKeyboardContext = () => useContext(KeyboardContext);

export default KeyboardContext;
