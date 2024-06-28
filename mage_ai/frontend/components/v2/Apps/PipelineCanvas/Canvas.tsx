import BlockNodeWrapper from '../../Canvas/Nodes/BlockNodeWrapper';
import CanvasContainer from './index.style';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import type { DropTargetMonitor } from 'react-dnd';
import {
  LayoutConfigType, DragItem, ModelMappingType, NodeItemType,
  NodeType
} from '../../Canvas/interfaces';
import useEventManager, { EventManagerType } from './useEventManager';
import useLayoutManager, { LayoutManagerType } from './useLayoutManager';
import useModelManager, { ModelManagerType } from './useModelManager';
import usePresentationManager, { PresentationManagerType } from './usePresentationManager';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { ItemTypeEnum, LayoutConfigDirectionOriginEnum, LayoutConfigDirectionEnum } from '../../Canvas/types';
import { RemoveContextMenuType, RenderContextMenuType } from '@mana/hooks/useContextMenu';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { useDrop } from 'react-dnd';
import { useEffect, useMemo, useRef, useState, startTransition } from 'react';

export type BuilderCanvasProps = {
  canvasRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  defaultActiveLevel?: number;
  dragEnabled?: boolean;
  dropEnabled?: boolean;
  // pipeline: PipelineExecutionFrameworkType;
  // executionFramework: PipelineExecutionFrameworkType;
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
  // pipeline,
  // executionFramework,
  pipelineUUID,
  executionFrameworkUUID,
  removeContextMenu,
  renderContextMenu,
  setDragEnabled,
  setDropEnabled,
  setZoomPanDisabled,
  transformState,
}: BuilderCanvasProps) => {
  const blocksCountRef = useRef<number>(null);
  const phaseRef = useRef<number>(0);
  const wrapperRef = useRef(null);
  const itemIDsByLevelRef = useRef<string[][]>(null);
  const [array, setArray] = useState([]);

  // VERY IMPORTANT THAT THE STATE IS IN THIS COMPONENT OR ELSE NOTHING WILL RENDER!
  const [pipeline, setPipeline] = useState<PipelineExecutionFrameworkType>(null);
  const [executionFramework, setExecutionFramework] = useState<PipelineExecutionFrameworkType>(null);
  const [version, setVersion] = useState<string>(null);

  const [items, setItemsState] = useState<Record<string, NodeItemType>>(null);
  const [activeItems, setActiveItemsState] = useState<Record<string, ModelMappingType>>(null);

  function setActiveItems(modelMapping: ModelMappingType) {
    setActiveItemsState(modelMapping);
  }

  const {
    appHandlersRef,
    initializeModels,
    itemsRef,
    mutateModels,
    portsRef,
    updateNodeItems,
    // What is this being used for?
    // updatePorts,
  }: ModelManagerType = useModelManager({
    itemIDsByLevelRef,
    pipelineUUID,
    setItemsState,
    setPipeline,
    setExecutionFramework,
    executionFrameworkUUID,
  });

  const {
    updateLayoutOfItems,
    updateLayoutConfig,
    activeLevel,
    setActiveLevel,
    // updateLocalSettings,
    layoutConfig,
  }: LayoutManagerType = useLayoutManager({
    pipeline,
    canvasRef,
    containerRef,
    array, setArray,
    itemIDsByLevelRef,
    itemsRef,
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
    array, setArray,
    itemIDsByLevelRef,
    itemsRef,
    layoutConfig,
    mutateModels,
    setVersion,
    portsRef,
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
    appHandlersRef,
    layoutConfig,
    updateLayoutConfig,
    updateLayoutOfItems,
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
    if (phaseRef.current === 0 && executionFrameworkUUID && pipelineUUID) {
      appHandlersRef.current.executionFrameworks.detail.mutate();
      appHandlersRef.current.pipelines.detail.mutate();
      phaseRef.current = 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionFrameworkUUID, pipelineUUID, executionFramework, pipeline]);

  useEffect(() => {
    if ((pipeline?.blocks?.length ?? null) !== (blocksCountRef.current ?? null) ||
      (blocksCountRef.current === null && executionFramework?.uuid && pipeline?.uuid)) {
      startTransition(() => {
        initializeModels(executionFramework, pipeline);
        updateItemsMetadata();

        blocksCountRef.current = pipeline?.blocks?.length;
      });
    }
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

  // const nodesMemo = useMemo(() => {
  //   return array?.map((rect: RectType, idx: number) => (
  //     <BlockNodeWrapper
  //       rect={rect}
  //       draggable={dragEnabled}
  //       droppable={dropEnabled}
  //       handlers={{
  //         onDragEnd: handleDragEnd,
  //         onDragStart: handleDragStart,
  //         onDrop: onDropPort,
  //         onMouseDown: handleMouseDown,

  //         // Not using right now.
  //         // onMouseOver: handleMouseOver,
  //         // onMouseLeave: handleMouseLeave,
  //       }}
  //       item={itemsRef.current[rect.id] as NodeItemType}
  //       key={rect.id}
  //       onMountItem={onMountItem}
  //       onMountPort={onMountPort}
  //       submitEventOperation={submitEventOperation}
  //       version={version}
  //     />
  //   ));
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [dragEnabled, dropEnabled, array]);

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

          {!array?.length && Object.values(items ?? {})?.map((item, idx) => (
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
              item={item}
              key={`${item.id}-${item.type}-${idx}`}
              onMountItem={onMountItem}
              onMountPort={onMountPort}
              submitEventOperation={submitEventOperation}
              version={version}
            />
          ))}

          {array?.length >= 1 && array?.map((rect, idx) => (
            <BlockNodeWrapper
              draggable={dragEnabled}
              rect={rect}
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
              item={itemsRef.current[rect.id] as NodeItemType}
              key={rect.id}
              onMountItem={onMountItem}
              onMountPort={onMountPort}
              submitEventOperation={submitEventOperation}
              version={version}
            />
          ))}
        </CanvasContainer>
      </div>
    </div>
  );
};

export default BuilderCanvas;
