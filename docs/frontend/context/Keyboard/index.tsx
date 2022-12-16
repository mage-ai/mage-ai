import React, { useContext } from 'react';

type KeyboardContextType = {
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
  unregisterOnKeyDown: (uuid: string) => void;
  unregisterOnKeyUp: (uuid: string) => void;
};

const KeyboardContext = React.createContext<KeyboardContextType>({
  registerOnKeyDown: null,
  registerOnKeyUp: null,
  unregisterOnKeyDown: null,
  unregisterOnKeyUp: null,
});

export const useKeyboardContext = () => useContext(KeyboardContext);

export default KeyboardContext;
