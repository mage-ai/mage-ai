import React, { useEffect, useRef } from 'react';
import useCustomEventHandler from '../events/useCustomEventHandler';
import useKeyboardShortcuts, { KeyboardShortcutsProps } from './shortcuts/useKeyboardShortcuts';
import { CustomKeyboardEvent, KeyboardPositionType, KeyboardDetailType } from '../events/interfaces';
import { DEBUG } from '../utils/debug';
import { EventEnum, KeyEnum } from '../events/enums';
import { MenuItemType } from '../components/Menu/interfaces';

export interface KeyboardNavigationProps {
  target: KeyboardShortcutsProps['target'];
}

export default function useKeyboardNavigation({
  target,
}: KeyboardNavigationProps): {
  itemsRef: React.MutableRefObject<MenuItemType[]>;
  registerItems: (items: MenuItemType[]) => void;
  resetPosition: () => void;
} {
  const itemsRef = useRef<MenuItemType[]>(null);
  const positionRef = useRef<KeyboardPositionType>(null);

  const { dispatchCustomEvent } = useCustomEventHandler('useKeyboardNavigation', null, {
    baseEvent: CustomKeyboardEvent,
  });

  const { deregisterCommands, registerCommands } = useKeyboardShortcuts({
    target,
  });

  function filterItems(items: MenuItemType[]): MenuItemType[] {
    return items?.filter(({ divider, onClick }: MenuItemType) => !divider && onClick);
  }

  function getCurrentItem(): {
    item: MenuItemType;
    items: MenuItemType[];
  } {
    if (!itemsRef?.current) return;

    let item = null;
    let items = filterItems(itemsRef?.current ? itemsRef?.current : []);

    positionRef?.current?.forEach((y: number, x: number) => {
      if (y === null) {
        item = null;
        return;
      }

      if (x >= 1 && item?.items?.length >= 1) {
        const arr = filterItems(item?.items ?? []);
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
    const { item, items } = getCurrentItem();

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

    dispatchCustomEvent(EventEnum.KEYDOWN, {
      position: positionRef.current,
      previousPosition: positionPrevious,
      previousTarget: item,
      target: getCurrentItem()?.item,
    } as KeyboardDetailType, [key]);
  }

  function registerItems(items: MenuItemType[]) {
    itemsRef.current = items;
    positionRef.current = [null];

    registerCommands({
      down: {
        handler: () => handlePositionChange({ y: 1 }),
        predicate: { key: KeyEnum.ARROWDOWN },
      },
      enter: {
        handler: () => {
          dispatchCustomEvent(EventEnum.KEYDOWN, {
            position: positionRef.current,
            target: getCurrentItem()?.item,
          } as KeyboardDetailType, [KeyEnum.ENTER]);
        },
        predicate: { key: KeyEnum.ENTER },
      },
      left: {
        handler: () => handlePositionChange({ x: -1 }),
        predicate: { key: KeyEnum.ARROWLEFT },
      },
      right: {
        handler: () => handlePositionChange({ x: 1 }),
        predicate: { key: KeyEnum.ARROWRIGHT },
      },
      up: {
        handler: () => handlePositionChange({ y: -1 }),
        predicate: { key: KeyEnum.ARROWUP },
      },
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
