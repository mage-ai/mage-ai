import React, { createRef, useRef } from 'react';
import update from 'immutability-helper';
import { ConnectionLines } from '../../Canvas/Connections/ConnectionLines';
import { DragItem, NodeItemType, NodeType, RectType, PortType, LayoutConfigType, ModelMappingType } from '../../Canvas/interfaces';
import { ItemTypeEnum, LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum, PortSubtypeEnum } from '../../Canvas/types';
import { LayoutManagerType } from './useLayoutManager';
import { ModelManagerType } from './useModelManager';
import { createRoot, Root } from 'react-dom/client';
import { getBlockColor } from '@mana/themes/blocks';
import { getPathD } from '../../Canvas/Connections/utils';
import { throttle } from '../../Canvas/utils/throttle';
import { ItemElementsType, ItemElementsRefType } from './interfaces';
import useDynamicDebounce from '@utils/hooks/useDebounce';

export default function useItemManager({
  itemElementsRef,
  itemsRef,
  updateLayoutOfItems,
}: {
  itemElementsRef: ItemElementsRefType;
  itemsRef: React.MutableRefObject<Record<string, NodeItemType>>;
  updateLayoutOfItems: LayoutManagerType['updateLayoutOfItems'];
}): {
  onMountItem: (item: DragItem, itemRef: React.RefObject<HTMLDivElement>) => void,
} {
  const [debouncer, cancelDebounce] = useDynamicDebounce();

  // Stage 2: Initial setup of components on mount.
  function onMountItem(item: DragItem, itemRef: React.RefObject<HTMLDivElement>) {
    const { id, type } = item;
    itemElementsRef.current ||= {} as ItemElementsType;
    itemElementsRef.current[type] ||= {};
    itemElementsRef.current[type][id] = itemRef;

    if (!itemRef.current || ![ItemTypeEnum.BLOCK, ItemTypeEnum.NODE].includes(type)) return;

    const rect = itemRef.current.getBoundingClientRect() as RectType;
    const elementBadge = itemRef?.current?.querySelector(`#${item.id}-badge`);
    const rectBadge = elementBadge?.getBoundingClientRect() ?? {
      height: 0,
      left: 0,
      top: 0,
      width: 0,
    };
    const elementTitle = itemRef?.current?.querySelector(`#${item.id}-title`);
    const rectTitle = elementTitle?.getBoundingClientRect() ?? {
      height: 0,
      left: 0,
      top: 0,
      width: 0,
    };

    item.rect ||= { left: 0, top: 0 };
    item.rect.width = rect.width;
    item.rect.height = rect.height;
    item.rect.badge = {
      height: rectBadge?.height,
      left: rectBadge?.left,
      top: rectBadge?.top,
      width: rectBadge?.width,
      offset: {
        top: (elementBadge as { offsetTop?: number })?.offsetTop,
      },
    };
    item.rect.title = {
      height: rectTitle?.height,
      left: rectTitle?.left,
      top: rectTitle?.top,
      width: rectTitle?.width,
      offset: {
        top: (elementTitle as { offsetTop?: number })?.offsetTop,
      },
    };
    item.rect.offset = {
      left: itemRef?.current?.offsetLeft,
      top: itemRef?.current?.offsetTop,
    };

    itemsRef.current[item.id] = item;
    console.log('mounted', item)
    cancelDebounce();
    debouncer(updateLayoutOfItems, 100);
  }

  return {
    onMountItem,
  };
}
