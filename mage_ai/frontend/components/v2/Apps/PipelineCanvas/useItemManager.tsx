import React, { createRef, useRef } from 'react';
import update from 'immutability-helper';
import { ConnectionLines } from '../../Canvas/Connections/ConnectionLines';
import { DragItem, NodeItemType, NodeType, RectType, PortType, LayoutConfigType, ModelMappingType, AppNodeType } from '../../Canvas/interfaces';
import { ItemStatusEnum, ItemTypeEnum, LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum, PortSubtypeEnum } from '../../Canvas/types';
import { LayoutManagerType } from './useLayoutManager';
import { ModelManagerType } from './useModelManager';
import { createRoot, Root } from 'react-dom/client';
import { getBlockColor } from '@mana/themes/blocks';
import { getPathD } from '../../Canvas/Connections/utils';
import { throttle } from '../../Canvas/utils/throttle';
import { ItemElementsType, ItemElementsRefType } from './interfaces';
import useDynamicDebounce from '@utils/hooks/useDebounce';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { ClientEventType } from '@mana/shared/interfaces';
import { AppStatusEnum } from '../constants';

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

  const handleNodeMounted = ({ detail: { event } }: CustomAppEvent) => {
    const { data, operationTarget } = event;
    const { node } = data;
    onMountItem(node, operationTarget as React.RefObject<HTMLDivElement>);
  };

  const { dispatchAppEvent } = useAppEventsHandler(null, {
    [CustomAppEventEnum.NODE_MOUNTED]: handleNodeMounted,
  });

  // Stage 2: Initial setup of components on mount.
  function onMountItem(item: NodeType, itemRef: React.RefObject<HTMLDivElement> | React.RefObject<HTMLElement>) {
    const { id, type } = item;
    itemElementsRef.current ||= {} as ItemElementsType;
    itemElementsRef.current[type] ||= {};
    itemElementsRef.current[type][id] = itemRef;

    if (!itemRef.current) return;

    if (![ItemTypeEnum.APP, ItemTypeEnum.BLOCK, ItemTypeEnum.NODE].includes(type)) return;

    const rect = itemRef.current.getBoundingClientRect() as RectType;
    item.rect ||= { left: 0, top: 0 };
    item.rect.height = rect.height;
    item.rect.width = rect.width;
    item.rect.offset = {
      left: itemRef?.current?.offsetLeft,
      top: itemRef?.current?.offsetTop,
    };

    if ([ItemTypeEnum.BLOCK, ItemTypeEnum.NODE].includes(type)) {
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

      item.rect.inner ||= {};
      item.rect.inner.badge = {
        height: rectBadge?.height,
        left: rectBadge?.left,
        top: rectBadge?.top,
        width: rectBadge?.width,
        offset: {
          top: (elementBadge as { offsetTop?: number })?.offsetTop,
        },
      };
      item.rect.inner.title = {
        height: rectTitle?.height,
        left: rectTitle?.left,
        top: rectTitle?.top,
        width: rectTitle?.width,
        offset: {
          top: (elementTitle as { offsetTop?: number })?.offsetTop,
        },
      };

      if (ItemStatusEnum.INITIALIZED === item?.status) {
        item.status = ItemStatusEnum.PENDING_LAYOUT;
      }

      itemsRef.current[item.id] = item;
      cancelDebounce();
      debouncer(updateLayoutOfItems, 100);
    } else if ([ItemTypeEnum.APP].includes(type)) {
      const node = itemsRef?.current?.[item?.upstream?.[0]];
      if (!node) return;
      const {
        height = 0,
        left = 0,
        top = 0,
        width = 0,
      } = node?.rect ?? {};
      item.rect.left = left + width + 20;
      item.rect.top = top - ((item.rect.height ?? 0) - height);

      if (AppStatusEnum.PENDING_LAYOUT === (item as AppNodeType)?.app?.status) {
        (item as AppNodeType).app.status = AppStatusEnum.READY;
      }

      dispatchAppEvent(CustomAppEventEnum.APP_RECT_UPDATED, {
        event: update({}, {
          data: {
            $set: {
              node: item,
            },
          },
          operationTarget: {
            $set: itemRef,
          },
        }) as any,
      });
    }
  }

  return {
    onMountItem,
  };
}
