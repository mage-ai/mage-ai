import React, { useEffect, useRef } from 'react';
import useCustomEventHandler from '../events/useCustomEventHandler';
import useKeyboardShortcuts, { KeyboardShortcutsProps } from './shortcuts/useKeyboardShortcuts';
import { DEBUG } from '../utils/debug';
import { EventEnum, KeyEnum } from '../events/enums';
import { CustomAppEvent, CustomKeyboardEvent } from '../events/interfaces';
import { MenuItemType } from '../components/Menu/interfaces';
import { range } from '@utils/array';

type CustomKeyboardEventType = any;
interface RegisterItemsOptions {
  commands?: any;
  position?: any;
}

export interface KeyboardNavigationProps {
  itemFilter?: (item: any) => boolean;
  target: any;
}

export default function useKeyboardNavigation({
  itemFilter = () => true,
  target,
}: KeyboardNavigationProps): {
  itemsRef: React.MutableRefObject<MenuItemType[]>;
  registerItems: (items: MenuItemType[], opts?: RegisterItemsOptions) => void;
  resetPosition: () => void;
} {
  const itemsRef = useRef<MenuItemType[]>(null);
  const positionRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  const { dispatchCustomEvent } = useCustomEventHandler(
    'useKeyboardNavigation',
    {
      [EventEnum.SET_KEYBOARD_NAVIGATION_POSITION]: handleSetPosition,
    },
    {
      baseEvent: CustomKeyboardEvent,
    },
  );

  function handleSetPosition(event: any) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      positionRef.current = [null];
      event?.detail?.position?.forEach((y: number, x: number) => {
        if (x >= 1) {
          handlePositionChange({ x: 1 });
        }
        range(y)?.forEach(() => {
          handlePositionChange({ y: 1 });
        });
      });
    }, 100);
  }

  const { deregisterCommands, registerCommands } = useKeyboardShortcuts({
    target,
  });

  function getCurrentItem(): {
    item: any;
    items: any[];
  } {
    if (!itemsRef?.current) return;

    let item = null;
    let items = (itemsRef?.current ? itemsRef?.current : [])?.filter(itemFilter);

    positionRef?.current?.forEach((y: number, x: number) => {
      if (y === null) {
        item = null;
        return;
      }

      if (x >= 1 && item?.items?.length >= 1) {
        const arr = (item?.items ?? [])?.filter(itemFilter);
        if (arr?.length >= 1) {
          items = arr;
        }
      }
      item = items?.[y];
    });

    return {
      item,
      items,
    };
  }

  function handlePositionChange({ x, y }: { x?: number; y?: number }) {
    const positionPrevious = [...(positionRef.current ?? [])];
    const { item, items } = getCurrentItem() ?? {};

    DEBUG.keyboard.navigation && console.log('position.args', x, y);

    let key = null;

    if (x ?? false) {
      key = x > 0 ? KeyEnum.ARROWRIGHT : KeyEnum.ARROWLEFT;
      if (x < 0 && positionRef.current.length >= 2) {
        positionRef.current.pop();
      } else if (x > 0) {
        const ycur = positionRef.current[positionRef.current.length - 1];
        const icur = items?.[ycur];
        if (icur?.items?.length >= 1) {
          positionRef.current.push(0);
        }
      }
      DEBUG.keyboard.navigation && console.log('position.x', positionRef.current?.length - 1);
    }

    if (y ?? false) {
      key = y > 0 ? KeyEnum.ARROWDOWN : KeyEnum.ARROWUP;

      let yNew =
        positionRef.current[positionRef.current.length - 1] ??
        (y > 0 ? -1 : item?.items?.length ?? 0);
      yNew += y;

      const count = items?.length ?? 0;
      if (yNew < 0) {
        yNew = 0;
      } else if (count >= 1 && yNew >= count) {
        yNew = count - 1;
      }
      positionRef.current[positionRef.current.length - 1] = yNew;

      DEBUG.keyboard.navigation && console.log('position.y', yNew);
    }

    DEBUG.keyboard.navigation && console.log('position.end', positionRef.current, positionPrevious);

    dispatchCustomEvent(
      EventEnum.KEYDOWN,
      {
        position: positionRef.current,
        previousPosition: positionPrevious,
        previousTarget: item,
        target: getCurrentItem()?.item,
      } as any,
      [key],
    );
  }

  function registerItems(items: MenuItemType[], opts?: RegisterItemsOptions) {
    itemsRef.current = items;
    positionRef.current = opts?.position?.length > 0 ? opts?.position : [null];

    registerCommands({
      down: {
        handler: () => handlePositionChange({ y: 1 }),
        predicate: { key: KeyEnum.ARROWDOWN, metaKey: false },
      },
      enter: {
        handler: () => {
          dispatchCustomEvent(
            EventEnum.KEYDOWN,
            {
              position: positionRef.current,
              target: getCurrentItem()?.item,
            } as any,
            [KeyEnum.ENTER],
          );
        },
        predicate: { key: KeyEnum.ENTER, metaKey: false },
      },
      left: {
        handler: () => handlePositionChange({ x: -1 }),
        predicate: { key: KeyEnum.ARROWLEFT, metaKey: false },
      },
      right: {
        handler: () => handlePositionChange({ x: 1 }),
        predicate: { key: KeyEnum.ARROWRIGHT, metaKey: false },
      },
      up: {
        handler: () => handlePositionChange({ y: -1 }),
        predicate: { key: KeyEnum.ARROWUP, metaKey: false },
      },
      ...(opts?.commands ?? {}),
    });
  }

  function resetPosition() {
    positionRef.current = [null];
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => deregisterCommands(), []);

  return {
    itemsRef,
    registerItems,
    resetPosition,
  };
}
