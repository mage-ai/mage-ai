import React, { useEffect, useRef } from 'react';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { CSSProperties } from 'react';
import { ElementRoleEnum } from '@mana/shared/types';
import { ItemTypeEnum } from '../types';
import { NodeItemType, PortType, RectType } from '../interfaces';
import { motion, useAnimation } from 'framer-motion';
import { useDrag, useDrop } from 'react-dnd';

type XY = {
  x: number;
  y: number;
};
type DragInfo = {
  delta: XY;
  offset: XY;
  point: XY;
  velocity: XY;
};

export type DragWrapperType = {
  draggable?: boolean;
  droppable?: boolean;
  droppableItemTypes?: ItemTypeEnum[];
  eventHandlers?: {
    onDrag?: (event: any, info: DragInfo, data: {
      item: NodeItemType;
      rect: RectType;
      ref: React.MutableRefObject<HTMLDivElement>;
    }) => void;
    onDragEnd?: (event: any, info: DragInfo, data: {
      item: NodeItemType;
      rect: RectType;
      ref: React.MutableRefObject<HTMLDivElement>;
    }) => void;
    onDragStart?: (event: any, info: DragInfo, data: {
      item: NodeItemType;
      rect: RectType;
      ref: React.MutableRefObject<HTMLDivElement>;
    }) => void;
    onMouseDown?: (event: any) => void;
  };
  handleDrop?: (dragTarget: NodeItemType, dropTarget: NodeItemType) => void;
};

type DragWrapperProps = {
  children?: React.ReactNode;
  dragConstraintsRef?: React.MutableRefObject<HTMLDivElement>;
  groupSelection?: boolean;
  isAnimating?: boolean;
  item?: NodeItemType;
  onContextMenu?: (event: any) => void;
  rect?: RectType;
  style?: any;
} & DragWrapperType;

export function getStyles(
  node: NodeItemType,
  {
    draggable,
    groupSelection,
    rect,
  }: {
    draggable?: boolean;
    groupSelection?: boolean;
    rect?: RectType;
  },
): CSSProperties {
  const { type } = node;

  const { height, left, top, width } = {
    height: undefined,
    left: undefined,
    top: undefined,
    width: undefined,
    ...rect,
  } as any;
  const transform = `translate3d(${left ?? 0}px, ${top ?? 0}px, 0)`;

  // console.log(left, top, height, width);

  return {
    WebkitTransform: transform,
    // backgroundColor: canDrop ? (isOverCurrent ? 'blue' : backgroundColor) : backgroundColor,
    // border: '1px dashed gray',
    // IE fallback: hide the real node using CSS when dragging
    // because IE will ignore our custom "empty image" drag preview.
    position: 'absolute',
    transform,
    ...(ItemTypeEnum.NODE === type
      ? {
          height,
        }
      : {}),
    ...(width ?? false ? { minWidth: width } : {}),
    ...(groupSelection ? { height, width } : {}),
    // ...(draggable ? { cursor: 'move' } : {}),
  };
}

function DragWrapper(
  {
    children,
    dragConstraintsRef,
    draggable,
    droppable,
    droppableItemTypes,
    eventHandlers,
    groupSelection,
    handleDrop,
    isAnimating,
    item,
    onContextMenu,
    rect,
    style,
  }: DragWrapperProps,
  ref: React.MutableRefObject<HTMLDivElement>,
) {
  const refInternal = useRef(null);
  const dragRef = ref ?? refInternal;

  // const [{ isDragging }, connectDrag, preview] = useDrag(
  //   () => ({
  //     collect: (monitor: DragSourceMonitor) => ({ isDragging: monitor.isDragging() }),
  //     isDragging: (monitor: DragSourceMonitor) => {
  //       const draggingItem = monitor.getItem() as NodeItemType;
  //       return draggingItem.id === item.id;
  //     },
  //     item: {
  //       ...item,
  //       rect,
  //     },
  //     type: item.type,
  //   }),
  //   [draggable, item],
  // );

  // const [, connectDrop] = useDrop(
  //   () => ({
  //     accept: droppableItemTypes ?? [],
  //     canDrop: (itemDrop: NodeItemType, monitor: DropTargetMonitor) => {
  //       if (!droppable) return false;
  //       if (!monitor.isOver({ shallow: true })) return false;

  //       if (ItemTypeEnum.BLOCK === itemDrop.type) {
  //         return itemDrop.id !== item.id;
  //       } else if (ItemTypeEnum.PORT === itemDrop.type) {
  //         return (itemDrop as PortType).parent.id !== item.id;
  //       }

  //       return false;
  //     },
  //     collect: monitor => ({
  //       canDrop: monitor.canDrop(),
  //       isOverCurrent: monitor.isOver({ shallow: true }),
  //     }),
  //     drop: (dragTarget: NodeItemType) => handleDrop?.(dragTarget, item),
  //   }),
  //   [droppable, droppableItemTypes, handleDrop, item],
  // );

  // useEffect(() => {
  //   preview(dragRef.current as Element);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // This needs to always connect without any conditionals or else it’ll never connect after mount.
  // connectDrop(dragRef);
  // connectDrag(dragRef);

  // console.log(
  //   `[DragWrapper:${item.id}]`,
  //   rect?.left, rect?.top, rect?.width, rect?.height,
  //   isAnimating, style,
  // );

  return (
    <motion.div
      {...(draggable ? Object.entries(eventHandlers ?? {}).reduce(
        (acc, [k, v]: [string, (event: any, info: DragInfo, data: {
          item: NodeItemType;
          rect: RectType;
          ref: React.MutableRefObject<HTMLDivElement>;
        }) => void]) => ({
          ...acc,
          [k]: draggable && v ? (e, i) => v(
            e,
            i,
            {
              item,
              rect,
              ref: dragRef,
            },
          ) : undefined,
        }),
        {},
      ) : {})}
      drag={draggable}
      dragConstraints={dragConstraintsRef}
      className={[
        stylesBlockNode.dragWrapper,
        groupSelection && stylesBlockNode.groupSelection,
        stylesBlockNode[item?.type],
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseDown={event => {
        // console.log(dragConstraintsRef?.current?.getBoundingClientRect())
        // event.stopPropagation();
        eventHandlers?.onMouseDown?.({
          ...event,
          target: dragRef.current,
        });
      }}
      onContextMenu={onContextMenu}
      initial={draggable && !item?.rect ? {
        translateX: rect?.left,
        translateY: rect?.top,
      } : undefined}
      ref={dragRef}
      role={[
        draggable && ElementRoleEnum.DRAGGABLE,
      ].filter(Boolean).join(' ')}
      style={
        isAnimating
          ? style
          : {
              ...getStyles(item, {
                draggable,
                groupSelection,
                rect,
              }),
            }
      }
      whileDrag={{
        opacity: 1,
        scale: 1,
      }}
      // dragSnapToOrigin
      // dragElastic={0.5}
      dragMomentum={false}
      dragPropagation={false}
      // dragTransition={{
      //   bounceDamping: 10,
      //   bounceStiffness: 100,
      //   min: 0,
      //   timeConstant: 750,
      // }}
    >
      {children}
    </motion.div>
  );
}

export function areEqual(p1: DragWrapperProps, p2: DragWrapperProps) {
  return (
    p1.rect.left === p2.rect.left &&
    p1.rect.top === p2.rect.top &&
    p1.rect.width === p2.rect.width &&
    p1.rect.height === p2.rect.height &&
    p1?.groupSelection === p2?.groupSelection &&
    p1?.isAnimating === p2?.isAnimating &&
    p1?.draggable === p2?.draggable
  );
}

export default React.memo(React.forwardRef(DragWrapper), areEqual);
