import BlockNodeWrapper from '../../Canvas/Nodes/BlockNodeWrapper';
import CanvasContainer from './index.style';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import type { DropTargetMonitor } from 'react-dnd';
import { LayoutConfigType, DragItem, ModelMappingType, NodeItemType,
NodeType,
RectType } from '../../Canvas/interfaces';
import styles from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import useEventManager, { EventManagerType } from './useEventManager';
import useLayoutManager, { LayoutManagerType } from './useLayoutManager';
import useModelManager, { ModelManagerType } from './useModelManager';
import usePresentationManager, { PresentationManagerType } from './usePresentationManager';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { RectTransformationScopeEnum, ItemTypeEnum, LayoutConfigDirectionOriginEnum, LayoutConfigDirectionEnum, TransformRectTypeEnum } from '../../Canvas/types';
import { RemoveContextMenuType, RenderContextMenuType } from '@mana/hooks/useContextMenu';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { calculateBoundingBox, getMaxOffset } from '../../Canvas/utils/rect';
import { useDrop } from 'react-dnd';
import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { flattenArray } from '@utils/array';

export type BuilderCanvasProps = {
  canvasRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  dragEnabled?: boolean;
  dropEnabled?: boolean;
  pipeline: PipelineExecutionFrameworkType;
  executionFramework: PipelineExecutionFrameworkType;
  removeContextMenu: RemoveContextMenuType;
  renderContextMenu: RenderContextMenuType;
  setDragEnabled: (value: boolean) => void;
  setDropEnabled: (value: boolean) => void;
  setZoomPanDisabled: (value: boolean) => void;
  transformState: React.MutableRefObject<ZoomPanStateType>;
};

const BuilderCanvas: React.FC<BuilderCanvasProps> = ({
  canvasRef,
  containerRef,
  dragEnabled,
  dropEnabled,
  pipeline,
  executionFramework,
  removeContextMenu,
  renderContextMenu,
  setDragEnabled,
  setDropEnabled,
  setZoomPanDisabled,
  transformState,
}: BuilderCanvasProps) => {
  const activeLevel = useRef<number>(null);
  const phaseRef = useRef<number>(0);
  const wrapperRef = useRef(null);

  const itemIDsByLevelRef = useRef<string[][]>(null);
  const validLevels = useRef<number[]>(null);

  const layoutConfig = useRef<LayoutConfigType>({
    containerRef: containerRef,
    defaultRect: {
      item: () => ({
        height: 75,
        left: null,
        top: null,
        width: 300,
        padding: {
          bottom: 12,
          left: 12,
          right: 12,
          top: 12,
        },
      }),
    },
    direction: LayoutConfigDirectionEnum.HORIZONTAL,
    gap: { column: 40, row: 40 },
    origin: LayoutConfigDirectionOriginEnum.LEFT,
    rectTransformations: [
      {
        options: () => ({ layout: { direction: LayoutConfigDirectionEnum.HORIZONTAL } }),
        scope: RectTransformationScopeEnum.CHILDREN,
        type: TransformRectTypeEnum.TREE,
      },
      {
        options: (rects: RectType[]) => ({
          offset: {
            left: 0,
            top: Math.max(
              ...flattenArray(rects?.map(rect => rect.children)).map(
                (rect) =>
                  (rect?.inner?.badge?.height ?? 0) +
                  (rect?.inner?.badge?.offset?.top ?? 0) +
                  (rect?.inner?.title?.height ?? 0) +
                  (rect?.inner?.title?.offset?.top ?? 0),
              ),
            ),
          },
          padding: {
            bottom: 12,
            left: 12,
            right: 12,
            top: 12,
          },
        }),
        scope: RectTransformationScopeEnum.SELF,
        type: TransformRectTypeEnum.FIT_TO_CHILDREN,
      },
      {
        options: () => ({ layout: { direction: LayoutConfigDirectionEnum.VERTICAL } }),
        type: TransformRectTypeEnum.TREE,
      },
      {
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return box?.width > containerRef?.current?.getBoundingClientRect()?.width;
        },
        options: () => ({ layout: { direction: LayoutConfigDirectionEnum.HORIZONTAL } }),
        type: TransformRectTypeEnum.TREE,
      },
      {
        scope: RectTransformationScopeEnum.CHILDREN,
        type: TransformRectTypeEnum.SHIFT_INTO_PARENT,
      },
      {
        options: () => ({ layout: { origin: LayoutConfigDirectionOriginEnum.BOTTOM } }),
        scope: RectTransformationScopeEnum.CHILDREN,
        type: TransformRectTypeEnum.ALIGN_CHILDREN,
      },
    ],
    transformStateRef: transformState,
    viewportRef: canvasRef,

    // containerRect: {
    //   left: 40,
    //   top: 40,
    //   height: window.innerHeight,
    //   width: window.innerWidth,
    // },
    // boundingRect: {
    //   // left: 0,
    //   // top: 0,
    //   height: window.innerHeight,
    //   width: window.innerWidth,
    // },
    // shiftRect: {
    //   top: 200,
    //   left: 300,
    // },
    // padRect: {
    //   bottom: 12,
    //   left: 12,
    //   right: 12,
    //   top: 12,
    // },
    // offsetRectFinal: {
    //   left: 300,
    //   top: 100,
    // },
    // transforms: [
    //   {
    //     left: null,
    //     top: null,
    //     type: 'set',
    //   },
    //   {
    //     top: 200,
    //     left: 200,
    //     bottom: 10,
    //     right: 10,
    //     type: 'pad',
    //   },
    //   {
    //     top: 200,
    //     left: 300,
    //     type: 'shift',
    //   },
    // ],
  });

  // VERY IMPORTANT THAT THE STATE IS IN THIS COMPONENT OR ELSE NOTHING WILL RENDER!
  const [items, setItemsState] = useState<Record<string, NodeItemType>>(null);
  const [activeItems, setActiveItemsState] = useState<Record<string, ModelMappingType>>(null);

  function setActiveItems(modelMapping: ModelMappingType) {
    setActiveItemsState(modelMapping);
  }

  function setActiveLevel(levelArg?: number) {
    const levelPrevious: number = activeLevel?.current ?? null;
    levelPrevious !== null &&
      containerRef?.current?.classList.remove(styles[`level-${levelPrevious}-active`]);

    let level: number = levelArg ?? (activeLevel?.current ?? 0);
    if (validLevels?.current?.length >= 1) {
      const idx = validLevels.current.findIndex(i => i === level);
      level = validLevels.current[idx + 1] ?? validLevels.current[0];
    } else {
      level += 1;
      if (level >= itemIDsByLevelRef?.current?.length) {
        level = 0;
      }
    }

    activeLevel.current = level;
    containerRef?.current?.classList.add(styles[`level-${level}-active`]);
  }

  const {
    initializeModels,
    itemsRef,
    mutateModels,
    portsRef,
    updateNodeItems,
    // What is this being used for?
    // updatePorts,
  }: ModelManagerType = useModelManager({
    itemIDsByLevelRef,
  });

  const {
    renderLayoutChanges,
    updateLayoutOfItems,
  }: LayoutManagerType = useLayoutManager({
    canvasRef,
    containerRef,
    itemIDsByLevelRef,
    itemsRef,
    layoutConfig,
    setItemsState,
    transformState,
    updateNodeItems,
  });

  const {
    connectionLinesPathRef,
    connectionLinesRootID,
    itemDraggingRef,
    itemElementsRef,
    onMountItem,
    onMountPort,
    renderConnectionLines,
    updateItemsMetadata,
    // What is this used for externally?
    // itemsMetadataRef,
  }: PresentationManagerType = usePresentationManager({
    activeLevel,
    itemIDsByLevelRef,
    itemsRef,
    layoutConfig,
    mutateModels,
    portsRef,
    renderLayoutChanges,
    setActiveLevel,
    updateLayoutOfItems,
    updateNodeItems,
  });

  const {
    gridDimensions,
    handleContextMenu,
    handleDoubleClick,
    handleDragEnd,
    handleDragStart,
    handleMouseDown,
    onDragging,
    onDropBlock,
    onDropPort,
    snapToGridOnDrag,
    submitEventOperation,
  }: EventManagerType = useEventManager({
    activeLevel,
    canvasRef,
    connectionLinesPathRef,
    containerRef,
    itemDraggingRef,
    itemElementsRef,
    itemIDsByLevelRef,
    itemsRef,
    mutateModels,
    portsRef,
    removeContextMenu,
    renderConnectionLines,
    renderContextMenu,
    setActiveLevel,
    setDragEnabled,
    setDropEnabled,
    setZoomPanDisabled,
    transformState,
  });

  useEffect(() => {
    if (phaseRef.current === 0 && executionFramework && pipeline) {
      startTransition(() => {
        initializeModels(executionFramework, pipeline);
        updateItemsMetadata();
        renderLayoutChanges({ items: itemsRef?.current });
      });

      phaseRef.current += 1;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionFramework, pipeline]);

  const [, connectDrop] = useDrop(
    () => ({
      // https://react-dnd.github.io/react-dnd/docs/api/use-drop
      accept: [ItemTypeEnum.BLOCK, ItemTypeEnum.NODE, ItemTypeEnum.PORT],
      canDrop: (node: NodeItemType, monitor: DropTargetMonitor) => {
        if (!monitor.isOver({ shallow: true })) {
          return false;
        }

        return true;
      },
      drop: (item: DragItem, monitor: DropTargetMonitor) => {
        onDropBlock(item, monitor);

        return undefined;
      },
      // hover: onDragInit,
    }),
    [],
  );
  connectDrop(canvasRef);

  const nodesMemo = useMemo(() => {
    const arr = [...Object.values(items || {})];

    return arr?.map((node: NodeType, idx: number) => (
      <BlockNodeWrapper
        draggable={dragEnabled}
        droppable={dropEnabled}
        handlers={{
          onDragEnd: handleDragEnd,
          onDragStart: handleDragStart,
          onDrop: onDropPort,
          onMouseDown: handleMouseDown,

          // Not using right now.
          // onMouseOver: handleMouseOver,
          // onMouseLeave: handleMouseLeave,
        }}
        item={node}
        key={`${node.id}-${node.type}-${idx}`}
        onMountItem={onMountItem}
        onMountPort={onMountPort}
        submitEventOperation={submitEventOperation}
      />
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragEnabled, dropEnabled, items]);

  return (
    <div
      ref={wrapperRef}
      style={{
        height: '100vh',
        overflow: 'visible',
        position: 'relative',
        width: '100vw',
      }}
    >
      <div
        onContextMenu={e => handleContextMenu(e as any)}
        onDoubleClick={handleDoubleClick}
        onMouseDown={e => handleMouseDown(e as any)}
        ref={canvasRef}
        style={{
          height: 'inherit',
          overflow: 'inherit',
          position: 'inherit',
          width: 'inherit',
        }}
      >
        <CanvasContainer gridSize={gridDimensions.current.height} ref={containerRef}>
          <DragLayer
            gridDimensions={{
              height: gridDimensions.current.height,
              width: gridDimensions.current.width,
            }}
            onDragging={onDragging}
            snapToGrid={snapToGridOnDrag}
          />

          <div id={connectionLinesRootID.current} />

          {nodesMemo}
        </CanvasContainer>
      </div>
    </div>
  );
};

export default BuilderCanvas;
