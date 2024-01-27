import { createRef, useEffect, useRef } from 'react';

import ElementType from '@interfaces/ElementType';
import { useKeyboardContext } from '@context/Keyboard';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import {
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_LEFT,
  KEY_CODE_ARROW_RIGHT,
  KEY_CODE_ARROW_UP,
} from '@utils/hooks/keyboardShortcuts/constants';

export enum NavigationDirectionEnum {
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  UP = 'up',
}

const DIRECTION_FOR_KEY_CODE = {
  [KEY_CODE_ARROW_DOWN]: NavigationDirectionEnum.DOWN,
  [KEY_CODE_ARROW_LEFT]: NavigationDirectionEnum.LEFT,
  [KEY_CODE_ARROW_RIGHT]: NavigationDirectionEnum.RIGHT,
  [KEY_CODE_ARROW_UP]: NavigationDirectionEnum.UP,
};

export default function useArrowNavigation({
  automaticallyRestartCycle = true,
  defaultColumnIndex,
  defaultRowIndex,
  onNavigation,
  shouldNavigate,
  uuid,
}: {
  automaticallyRestartCycle?: boolean;
  defaultColumnIndex?: number;
  defaultRowIndex?: number;
  onNavigation?: (
    direction: NavigationDirectionEnum,
    unitsNavigated: number,
    nextElement: ElementType,
    previousElement: ElementType,
  ) => void;
  shouldNavigate?: (
    direction: NavigationDirectionEnum,
    unitsNavigated: number,
    nextElement: ElementType,
    previousElement: ElementType,
  ) => boolean;
  uuid: string;
}): {
  registerElements: (elements: ElementType[][]) => void;
} {
  const rowIndexRef = useRef(defaultRowIndex || 0);
  const columnIndexRef = useRef(defaultColumnIndex || 0);
  const elementsRef = useRef(null);

  function registerElements(elements: ElementType[]) {
    elementsRef.current = elements;
  }

  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    registerOnKeyUp,
    unregisterOnKeyDown,
    unregisterOnKeyUp,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuid);
    unregisterOnKeyUp(uuid);
  }, [unregisterOnKeyDown, unregisterOnKeyUp, uuid]);

  registerOnKeyDown(uuid, (event, keyMapping, keyHistory) => {

    const key = [
      KEY_CODE_ARROW_DOWN,
      KEY_CODE_ARROW_LEFT,
      KEY_CODE_ARROW_RIGHT,
      KEY_CODE_ARROW_UP,
    ].find(key => onlyKeysPresent([key], keyMapping));

    if (key) {
      console.log('wtfffffffffffffffffffffff',key)
      let direction = DIRECTION_FOR_KEY_CODE[key];
      let units = 1;

      const factor = [
        KEY_CODE_ARROW_LEFT,
        KEY_CODE_ARROW_UP,
      ].includes(key) ? -1 : 1;

      let index;
      const columnWise = [KEY_CODE_ARROW_LEFT, KEY_CODE_ARROW_RIGHT].includes(key);
      if (columnWise) {
        index = columnIndexRef.current !== null
        ? columnIndexRef.current
        : typeof defaultColumnIndex !== 'undefined'
          ? defaultColumnIndex
          : 0;
      } else {
        index = rowIndexRef.current !== null
        ? rowIndexRef.current
        : typeof defaultRowIndex !== 'undefined'
          ? defaultRowIndex
          : 0;
      }

      index = index + (units * factor);

      let prev;
      let next;

      if (columnWise) {
        prev = elementsRef?.current?.[rowIndexRef.current]?.[index];
        next = elementsRef?.current?.[rowIndexRef.current]?.[index + (units * factor)];
      } else {
        prev = elementsRef?.current?.[index];
        next = elementsRef?.current?.[index + (units * factor)]
      }
      const args = [NavigationDirectionEnum.DOWN, 1, next, prev];

      console.log(args)

      if (shouldNavigate?.(...args)) {
        if (columnWise) {
          rowIndexRef.current = index;
        } else {
          columnIndexRef.current = index;
        }
        onNavigation(...args);
      }
    }
  }, []);

  return {
    registerElements,
  };
}
