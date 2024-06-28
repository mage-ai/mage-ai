import React from 'react';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { CSSProperties, FC } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { memo, useEffect, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { DragItem, NodeItemType, PortType, RectType } from '../interfaces';
import { ItemTypeEnum } from '../types';
import { DragAndDropType } from './types';
import { ElementRoleEnum } from '@mana/shared/types';

export function getStyles(
  item: NodeItemType,
  {
    draggable,
    isDragging,
    rect,
  }: {
    draggable: boolean;
    isDragging: boolean;
  },
): CSSProperties {
  const { id, type } = item;
  rect = rect ?? item?.rect;
  const { left, top, width, zIndex } = rect || ({} as RectType);
  const transform = `translate3d(${left ?? 0}px, ${top ?? 0}px, 0)`;

  return {
    WebkitTransform: transform,
    // backgroundColor: canDrop ? (isOverCurrent ? 'blue' : backgroundColor) : backgroundColor,
    // border: '1px dashed gray',
    // IE fallback: hide the real node using CSS when dragging
    // because IE will ignore our custom "empty image" drag preview.
    position: 'absolute',
    transform,
    zIndex,
    ...(draggable ? { cursor: 'move' } : {}),
    ...(isDragging
      ? { height: 0, opacity: 0 }
      : {
        minHeight: rect?.height === Infinity || rect?.height === -Infinity ? 0 : rect?.height ?? 0,
      }),
    ...((width ?? false) ? { minWidth: width } : {}),
  };
}
