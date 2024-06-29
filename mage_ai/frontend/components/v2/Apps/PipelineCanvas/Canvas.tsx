
import DraggableBlockNode from '../../Canvas/Nodes/DraggableBlockNode';
import CanvasContainer from './index.style';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import type { DropTargetMonitor } from 'react-dnd';
import {
  LayoutConfigType, DragItem, ModelMappingType, NodeItemType, RectType,
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
import useItemManager from './useItemManager';
import useDynamicDebounce from '@utils/hooks/useDebounce';
import { ItemElementsType } from './interfaces';

export type BuilderCanvasProps = {
  canvasRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  defaultActiveLevel?: number;
  dragEnabled?: boolean;
  dropEnabled?: boolean;
  pipelineUUID: string;
  executionFrameworkUUID: string;
  removeContextMenu: RemoveContextMenuType;
  renderContextMenu: RenderContextMenuType;
  setDragEnabled: (value: boolean) => void;
  setDropEnabled: (value: boolean) => void;
  setZoomPanDisabled: (value: boolean) => void;
  transformState: React.MutableRefObject<ZoomPanStateType>;
};
import useNodeManager from './useNodeManager';

// To update and render new views:
// 1. Update the models using initialize models: initializeModels
// 2. Update the layout of the items: updateLayoutOfItems (this takes care of setItemRects as well).
// 3. Update the rects of the DraggableBlockNodes: setItemRects


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
  const [itemRects, setItemRects] = useState([]);

  const itemElementsRef = useRef<ItemElementsType>({
    [ItemTypeEnum.BLOCK]: {},
    [ItemTypeEnum.NODE]: {},
    [ItemTypeEnum.PORT]: {},
  });
  const itemIDsByLevelRef = useRef<string[][]>(null);
  const phaseRef = useRef<number>(0);
  const wrapperRef = useRef(null);

  // VERY IMPORTANT THAT THE STATE IS IN THIS COMPONENT OR ELSE NOTHING WILL RENDER!
  const [pipeline, setPipeline] = useState<PipelineExecutionFrameworkType>(null);
  const [executionFramework, setExecutionFramework] = useState<PipelineExecutionFrameworkType>(null);

  const {
    appHandlersRef,
    itemsRef,
    mutateModels,
    onItemChangeRef,
    onModelChangeRef,
    portsRef,
  }: ModelManagerType = useModelManager({
    executionFrameworkUUID,
    itemElementsRef,
    itemIDsByLevelRef,
    pipelineUUID,
    setItemRects,
  });

  const {
    updateLayoutOfItems,
    updateLayoutConfig,
    activeLevel,
    setActiveLevel,
    // updateLocalSettings,
    layoutConfig,
  }: LayoutManagerType = useLayoutManager({
    canvasRef,
    containerRef,
    itemIDsByLevelRef,
    itemsRef,
    pipeline,
    setItemRects,
    transformState,
  });

  const { onMountItem } = useItemManager({ itemElementsRef, itemsRef, updateLayoutOfItems });

  const {
    addNewComponent,
    dynamicRootRef,
    removeComponentById,
  } = useNodeManager({
    itemRects,
    itemElementsRef,
    dragEnabled,
    updateLayoutOfItems,
    setItemRects,
    dropEnabled,
    handleDragEnd,
    handleDragStart,
    handleMouseDown,
    itemsRef,
    onDropPort,
    onMountItem,
    onItemChangeRef,
    onModelChangeRef,
    onMountPort,
    submitEventOperation,
  });


  const {
    connectionLinesPathRef,
    connectionLinesRootID,
    itemDraggingRef,
    onMountPort,
    renderConnectionLines,
    updateItemsMetadata,
    // What is this used for externally?
    // itemsMetadataRef,
  }: PresentationManagerType = usePresentationManager({
    activeLevel,
    itemElementsRef,
    itemIDsByLevelRef,
    itemsRef,
    layoutConfig,
    mutateModels,
    portsRef,
    setActiveLevel,
    updateLayoutOfItems,
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
          <div id="dynamic-components-root" ref={dynamicRootRef} />

          {itemRects?.map((item: NodeItemType) => itemsRef.current[item.id] && (
            <DraggableBlockNode
              handlers={{
                onDragEnd: handleDragEnd,
                onDragStart: handleDragStart,
                onDrop: onDropPort,
                onMouseDown: handleMouseDown,
              }}
              item={itemsRef.current[item.id] as NodeItemType}
              key={item.id}
              onMountItem={(item: DragItem, ref: React.RefObject<HTMLDivElement>) => {
                onMountItem(item, ref);
                removeComponentById(item.id);
              }}
              onMountPort={onMountPort}
              rect={item.rect}
              submitEventOperation={submitEventOperation}
            />
          ))}
        </CanvasContainer>
      </div>
    </div>
  );
};

export default BuilderCanvas;
