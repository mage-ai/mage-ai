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
  dragControlsRef?: React.MutableRefObject<Record<string, any>>;
  groupSelection?: boolean;
  isAnimating?: boolean;
  item?: NodeItemType;
  mountRootRef?: React.MutableRefObject<HTMLDivElement>;
  onContextMenu?: (event: any) => void;
  rect?: RectType;
  rectsMappingRef?: React.MutableRefObject<Record<string, RectType>>;
  resizable?: boolean;
  resizeConstraints?: {
    maximum?: RectType;
    minimum?: RectType;
  };
  style?: any;
} & DragWrapperType;

function DragWrapper({
  children,
  dragConstraintsRef,
  dragControlsRef,
  draggable,
  eventHandlers,
  groupSelection,
  isAnimating,
  item,
  mountRootRef,
  onContextMenu,
  rect: rectProp,
  rectsMappingRef,
  resizable,
  resizeConstraints,
  style,
}: DragWrapperProps, ref: React.MutableRefObject<HTMLDivElement>) {
  const rect = rectsMappingRef?.current?.[item?.id] ?? rectProp;
  // console.log('rect.width', item?.id, rectProp?.width, rectsMappingRef?.current?.[item?.id]?.width, rect?.width);
  // console.log('rect.height', item?.id, rectProp?.height, rectsMappingRef?.current?.[item?.id]?.height, rect?.height);

  const refInternal = useRef(null);
  const dragRef = ref ?? refInternal;

  const draggingRef = useRef(false);
  const timeoutRef = useRef(null);

  const dragControls = dragControlsRef?.current?.[item?.id] ?? undefined;
  const controlsBottom = useDragControls();
  const controlsRight = useDragControls();

  const handleX = useMotionValue(0);
  const handleY = useMotionValue(0);
  const handleTranslateX = useTransform(handleX, value => -value);
  const handleTranslateY = useTransform(handleY, value => -value);

  const heightTransform = useTransform(handleY, value => {
    // Buggy:
    // const vmin = resizeConstraints?.minimum?.height;
    const vnew = (rect?.height ?? 0) + value;

    return vnew;
  });
  const widthTransform = useTransform(handleX, value => {
    // Buggy:
    // const vmin = resizeConstraints?.minimum?.width;
    const vnew = (rect?.width ?? 0) + value;

    return vnew;
  });

  const [isDragging, setIsDragging] = useState(false);

  const wrapperStyles = useMemo(() => getStyles(item, {
    draggable,
    groupSelection,
    rect,
  }), [draggable, groupSelection, item, rect]);

  const handlers: EventHandlersType =
    useMemo(() => ((draggable || resizable) ? Object.entries(eventHandlers ?? {}).reduce(
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

  const { onDragStart, onDrag, onDragEnd, onMouseDown } = handlers;

  const dragHandlers = useMemo(() => ({
    onDragEnd: (event, info) => onDragEnd(event, info, {
      item,
      rect,
      ref: dragRef,
    }),
    onPointerUp: (event) => onDragEnd(event, null, {
      item,
      rect,
      ref: dragRef,
    }),
    onPointerDown: event => onDragStart(event, null, {
      item,
      rect,
      ref: dragRef,
    }),
    onMouseDown: event => onMouseDown?.({ ...event, target: dragRef.current }),
  }), [onDragEnd, onDragStart, onMouseDown, rect]);

  const startDrag = useCallback((event: any, {
    bottom = false,
    right = false,
  }) => {
    event.preventDefault();

    bottom && controlsBottom.start(event);
    right && controlsRight.start(event);

    onDragStart(event, null, {
      item,
      rect,
      ref: dragRef,
    });

    handleX.set(0);
    handleY.set(0);

    // translateXStartRef.current = rect?.left ?? 0;
    // translateYStartRef.current = rect?.top ?? 0;

    // dragRef.current.style.transformOrigin = `${rect?.left}px ${rect?.top}px`;
    // dragRef.current.style.transform = `translate(${handleX.get()}px, ${handleY.get()}px)`

    // console.log(
    //   'start',
    //   dragRef.current.style.transform,
    //   dragRef.current.style.transformOrigin,
    //   // translateXTransform.get(),
    //   // translateYTransform.get(),
    // )

    draggingRef.current = true;
    setIsDragging(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDragStart, item, rect]);

  function isWidthMinimum() {
    return widthTransform.get() < (resizeConstraints?.minimum?.width ?? 0);
  }

  function isHeightMinimum() {
    return heightTransform.get() < (resizeConstraints?.minimum?.height ?? 0);
  }

  useMotionValueEvent(handleX, 'change', (latest: number) => {
    dragRef.current.style.transform =
      `translate(${rect?.left}px, ${rect?.top}px)`;

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

  useMotionValueEvent(handleY, 'change', (latest: number) => {
    // clearTimeout(timeoutRef.current);

    // Add latest if resising upwards (top) or left (left)
    dragRef.current.style.transform =
      `translate(${rect?.left}px, ${rect?.top}px)`;

    // if (draggingRef.current) {
    //   timeoutRef.current = setTimeout(() => {
    //     draggingRef.current = false;
    //     setIsDragging(false);
    //     endDrag(null);
    //   }, 1000);
    // }

    // dragRef.current.style.transformOrigin = `${rect?.left}px ${rect?.top}px`;
    // dragRef.current.style.transform = `translate(${handleX.get()}px, ${handleY.get()}px)`

    // console.log(
    //   'dragging',
    //   dragRef.current.style.transform,
    //   dragRef.current.style.transformOrigin,
    //   // translateXTransform.get(),
    //   // translateXTransform.get(),
    // )

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

    // if (isHeightMinimum()) {
    //   handleY.set(0);
    // }

    // if (isWidthMinimum()) {
    //   handleX.set(0);
    // }

    // dragRef.current.style.height = `${heightTransform.get()}px`;
    // dragRef.current.style.transformOrigin = '';

    draggingRef.current = false;
    setIsDragging(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDragEnd, item, rect]);

  return (
    <motion.div
      {...dragHandlers}
      className={[
        stylesBlockNode.dragWrapper,
        groupSelection && stylesBlockNode.groupSelection,
        stylesBlockNode[item?.type],
      ].filter(Boolean).join(' ')}
      drag={draggable}
      dragControls={dragControls}
      dragMomentum={false}
      dragPropagation={false}
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
          minWidth: widthTransform,
          width: widthTransform,
          // translateX: translateXTransform,
          // translateY: translateYTransform,
        } : {}),
      }}
      whileDrag={{
        opacity: 0.9,
        scale: 1,
      }}
    >
      {resizable && (
        <motion.div
          className={[
            stylesBlockNode.resizeHandle,
            stylesBlockNode.bottom,
          ].filter(Boolean).join(' ')}
          drag="y"
          dragControls={controlsBottom}
          dragMomentum={false}
          dragPropagation={false}
          initial={{ opacity: 0 }}
          onDragEnd={(event) => {
            // console.log('END');
            endDrag(event);
          }}
          onPointerUp={(event) => {
            // console.log('UP');
            endDrag(event);
          }}
          onPointerDown={(event: any) => startDrag(event, { bottom: true })}
          role={[
            resizable && ElementRoleEnum.RESIZEABLE,
          ].filter(Boolean).join(' ')}
          style={{
            originX: 0.5,
            originY: 0.5,
            translateY: handleTranslateY,
            y: handleY,
          }}
          whileDrag={{
            opacity: 0.0,
            scaleY: 0.1,
            transition: {
              duration: 0,
            }
          }}
          whileHover={{ opacity: 0.3, scaleY: 1 }}
          whileTap={{ opacity: 0.2, scaleY: 0.5 }}
        />
      )}

      {resizable && (
        <motion.div
          className={[
            stylesBlockNode.resizeHandle,
            stylesBlockNode.right,
          ].filter(Boolean).join(' ')}
          drag="x"
          dragControls={controlsRight}
          dragMomentum={false}
          dragPropagation={false}
          initial={{ opacity: 0 }}
          onDragEnd={(event) => {
            // console.log('END');
            endDrag(event);
          }}
          onPointerUp={(event) => {
            // console.log('UP');
            endDrag(event);
          }}
          onPointerDown={(event: any) => startDrag(event, { right: true })}
          role={[
            resizable && ElementRoleEnum.RESIZEABLE,
          ].filter(Boolean).join(' ')}
          style={{
            originX: 0.5,
            originY: 0.5,
            translateX: handleTranslateX,
            x: handleX,
          }}
          whileDrag={{
            opacity: 0.0,
            scaleX: 0.1,
            transition: {
              duration: 0,
            }
          }}
          whileHover={{ opacity: 0.3, scaleX: 1 }}
          whileTap={{ opacity: 0.2, scaleX: 0.5 }}
        />
      )}

      {mountRootRef && <div ref={mountRootRef} />}

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
    && p1?.resizeConstraints?.minimum?.left === p2?. resizeConstraints?.minimum?.left
    && p1?.resizeConstraints?.minimum?.top === p2?. resizeConstraints?.minimum?.top
    && p1?.resizeConstraints?.minimum?.width === p2?. resizeConstraints?.minimum?.width
    && p1?.resizeConstraints?.minimum?.height === p2?. resizeConstraints?.minimum?.height
    && p1?.groupSelection === p2?.groupSelection
    && p1?.isAnimating === p2?.isAnimating
    && p1?.draggable === p2?.draggable
    && p1?.resizable === p2?.resizable
  );
}

export default React.forwardRef(DragWrapper);
