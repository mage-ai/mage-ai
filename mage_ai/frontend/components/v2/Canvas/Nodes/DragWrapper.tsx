import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { ElementRoleEnum } from '@mana/shared/types';
import { NodeItemType } from '../interfaces';
import { RectType, XYType } from '@mana/shared/interfaces';
import { getStyles } from './draggable/utils';
import { motion, useMotionValueEvent, useDragControls, useMotionValue, useTransform } from 'framer-motion';

type DragInfo = {
  delta?: XYType;
  offset?: XYType;
  point?: XYType;
  velocity?: XYType;
};

interface EventHandlersType {
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
  pauseZoomPan?: (event: any) => void;
}

export type DragWrapperType = {
  draggable?: boolean;
  eventHandlers?: EventHandlersType;
};

type DragWrapperProps = {
  children?: React.ReactNode;
  dragConstraintsRef?: React.MutableRefObject<HTMLDivElement>;
  groupSelection?: boolean;
  isAnimating?: boolean;
  item?: NodeItemType;
  onContextMenu?: (event: any) => void;
  rect?: RectType;
  resizable?: boolean;
  style?: any;
} & DragWrapperType;

function DragWrapper({
  children,
  dragConstraintsRef,
  draggable,
  eventHandlers,
  groupSelection,
  isAnimating,
  item,
  onContextMenu,
  rect,
  resizable,
  style,
}: DragWrapperProps, ref: React.MutableRefObject<HTMLDivElement>) {
  const refInternal = useRef(null);
  const dragRef = ref ?? refInternal;
  const resizeHandleTopRef = useRef(null);

  const draggingRef = useRef(false);
  const timeoutRef = useRef(null);

  const controlsPosition = useDragControls();
  const controlsSize = useDragControls();

  const handleX = useMotionValue(0);
  const handleY = useMotionValue(0);
  const handleTranslateY = useTransform(handleY, value => -value);

  const heightTransform = useTransform(handleY, value => (rect?.height ?? 0) - value);

  const [isDragging, setIsDragging] = useState(false);

  const wrapperStyles = useMemo(() => getStyles(item, {
    draggable,
    groupSelection,
    rect,
  }), [draggable, item]);

  const handlers: EventHandlersType = useMemo(() => ((draggable || resizable) ? Object.entries(eventHandlers ?? {}).reduce(
    (acc, [k, v]: [string, (event: any, info: DragInfo, data: {
      item: NodeItemType;
      rect: RectType;
      ref: React.MutableRefObject<HTMLDivElement>;
    }) => void]) => ({
      ...acc,
      [k]: (draggable || resizable) && v ? (evt: any, info: DragInfo) => v(
        evt,
        info,
        {
          item,
          rect,
          ref: dragRef,
        },
      ) : undefined,
    }),
    {},
  ) : {
    onDragStart: undefined,
    onDrag: undefined,
    onDragEnd: undefined,
  }), [draggable, eventHandlers, resizable]);

  const { onDragStart, onDrag, onDragEnd } = handlers;

  const startDrag = useCallback((event: any) => {
    event.preventDefault();
    controlsSize.start(event);
    onDragStart(event, null, {
      item,
      rect,
      ref: dragRef,
    });

    handleY.set(0);

    // translateXStartRef.current = rect?.left ?? 0;
    // translateYStartRef.current = rect?.top ?? 0;

    // dragRef.current.style.transformOrigin = `${rect?.left}px ${rect?.top}px`;
    // dragRef.current.style.transform = `translate(${handleX.get()}px, ${handleY.get()}px)`
    // resizeHandleTopRef.current.style.transformOrigin = dragRef.current.style.transformOrigin;

    console.log(
      'start',
      dragRef.current.style.transform,
      dragRef.current.style.transformOrigin,
      // translateXTransform.get(),
      // translateYTransform.get(),
      resizeHandleTopRef.current.style.transformOrigin,
    )

    draggingRef.current = true;
    setIsDragging(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDragStart, item, rect]);

  useMotionValueEvent(handleY, 'change', (latest: number) => {
    // clearTimeout(timeoutRef.current);

    dragRef.current.style.transform =
      `translate(${rect?.left}px, ${rect?.top + latest}px)`;

    // if (draggingRef.current) {
    //   timeoutRef.current = setTimeout(() => {
    //     draggingRef.current = false;
    //     setIsDragging(false);
    //     endDrag(null);
    //   }, 1000);
    // }

    // dragRef.current.style.transformOrigin = `${rect?.left}px ${rect?.top}px`;
    // dragRef.current.style.transform = `translate(${handleX.get()}px, ${handleY.get()}px)`
    // resizeHandleTopRef.current.style.transformOrigin = dragRef.current.style.transformOrigin;

    console.log(
      'dragging',
      dragRef.current.style.transform,
      dragRef.current.style.transformOrigin,
      // translateXTransform.get(),
      // translateXTransform.get(),
      resizeHandleTopRef.current.style.transformOrigin,
    )

    onDrag(null, {
      delta: {
        y: latest,
      }
    }, {
      item,
      rect,
      ref: dragRef,
    });
  });

  const endDrag = useCallback((event: any) => {
    onDragEnd(event, null, {
      item,
      rect,
      ref: dragRef,
    });

    // dragRef.current.style.height = `${heightTransform.get()}px`;
    // dragRef.current.style.transformOrigin = '';

    draggingRef.current = false;
    setIsDragging(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDragEnd, item, rect]);

  return (
    <motion.div
      // {...handlers}
      className={[
        stylesBlockNode.dragWrapper,
        groupSelection && stylesBlockNode.groupSelection,
        stylesBlockNode[item?.type],
      ].filter(Boolean).join(' ')}
      initial={draggable && !item?.rect ? {
        translateX: rect?.left,
        translateY: rect?.top,
      } : undefined}
      onContextMenu={onContextMenu}
      role={[draggable && ElementRoleEnum.DRAGGABLE].filter(Boolean).join(' ')}
      ref={dragRef}
      style={{
        ...(isAnimating ? style : wrapperStyles),
        ...(isDragging ? {
          height: heightTransform,
          // translateX: translateXTransform,
          // translateY: translateYTransform,
        } : {}),
      }}
    >
      <motion.div
        // {...handlers}
        // drag={false && draggable && !resizingRef.current}
        // dragSnapToOrigin
        // dragElastic={0.5}
        // dragTransition={{
        //   bounceDamping: 10,
        //   bounceStiffness: 100,
        //   min: 0,
        //   timeConstant: 750,
        // }}
        dragConstraints={dragConstraintsRef}
        dragControls={controlsPosition}
        dragMomentum={false}
        dragPropagation={false}
        onMouseDown={event => {
          eventHandlers?.onMouseDown?.({
            ...event,
            target: dragRef.current,
          });
        }}
        // initial={draggable && !item?.rect ? {
        //   translateX: rect?.left,
        //   translateY: rect?.top,
        // } : undefined}
        role={[draggable && ElementRoleEnum.DRAGGABLE].filter(Boolean).join(' ')}
        // style={getStyles(item, {
        //   draggable,
        //   groupSelection,
        //   rect,
        // })}
        whileDrag={{
          opacity: 1,
          scale: 1,
        }}
      />
      {resizable && <motion.div
        className={[
          stylesBlockNode.resizeHandle,
          stylesBlockNode.top,
        ].filter(Boolean).join(' ')}
        drag="y"
        dragControls={controlsSize}
        dragMomentum={false}
        dragPropagation={false}
        onDragEnd={endDrag}
        onPointerDown={startDrag}
        ref={resizeHandleTopRef}
        role={[
          draggable && ElementRoleEnum.DRAGGABLE,
        ].filter(Boolean).join(' ')}
        style={{
          originX: 0.5,
          originY: 0.5,
          translateY: handleTranslateY,
          x: handleX,
          y: handleY,
        }}
        whileDrag={{
          opacity: 0.3,
          scaleY: 0.1,
          transition: {
            duration: 0,
          }
        }}
        whileHover={{ scaleY: 3 }}
        whileTap={{ opacity: 1, scaleY: 0.5 }}
      />}

      {children}
    </motion.div>
  );
}

export function areEqual(p1: DragWrapperProps, p2: DragWrapperProps) {
  return (
    p1.rect.left === p2.rect.left
    && p1.rect.top === p2.rect.top
    && p1.rect.width === p2.rect.width
    && p1.rect.height === p2.rect.height
    && p1?.groupSelection === p2?.groupSelection
    && p1?.isAnimating === p2?.isAnimating
    && p1?.draggable === p2?.draggable
    && p1?.resizable === p2?.resizable
  );
}

export default React.memo(React.forwardRef(DragWrapper), areEqual);
