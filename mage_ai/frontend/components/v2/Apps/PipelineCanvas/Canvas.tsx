import DraggableAppNode from '../../Canvas/Nodes/Apps/DraggableAppNode';
import DraggableBlockNode from '../../Canvas/Nodes/DraggableBlockNode';
import CanvasContainer from './index.style';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import type { DropTargetMonitor } from 'react-dnd';
import {
  LayoutConfigType, DragItem, ModelMappingType, NodeItemType, RectType,
  NodeType, FlatItemType,
  AppNodeType
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
import { groupBy, unique, sortByKey, flattenArray } from '@utils/array';
import useNodeManager from './useNodeManager';
import useAppManager from './useAppManager';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';

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
  const activeLevel = useRef<number>(null);
  const itemElementsRef = useRef<ItemElementsType>({
    [ItemTypeEnum.APP]: {},
    [ItemTypeEnum.BLOCK]: {},
    [ItemTypeEnum.NODE]: {},
    [ItemTypeEnum.PORT]: {},
  });
  const itemIDsByLevelRef = useRef<string[][]>(null);
  const phaseRef = useRef<number>(0);
  const wrapperRef = useRef(null);

  const [itemRects, setItemRectsState] = useState<FlatItemType[]>([]);
  const [appNodes, setAppNodes] = useState<AppNodeType[]>([]);

  function setItemRects(items: NodeItemType[] | ((items: FlatItemType[]) => FlatItemType[])) {
    const buildItem = ({ id, rect }: NodeItemType): FlatItemType => {
      const { left, top, width, height } = rect ?? {};
      return [String(id), left, top, width, height];
    };

    startTransition(() => {
      setItemRectsState((itemsPrev: FlatItemType[]) =>
        typeof items === 'function'
          ? items(itemsPrev) as FlatItemType[]
          : (items as NodeItemType[])?.map((i: NodeItemType) => buildItem(i)) as FlatItemType[]
      );
    });
  }

  // VERY IMPORTANT THAT THE STATE IS IN THIS COMPONENT OR ELSE NOTHING WILL RENDER!
  const [pipeline, setPipeline] = useState<PipelineExecutionFrameworkType>(null);
  const [executionFramework, setExecutionFramework] = useState<PipelineExecutionFrameworkType>(null);

  const handleAppStarted = ({ detail: { manager } }: CustomAppEvent) => {
    console.log(manager)
    setAppNodes(flattenArray(Object.values(manager?.appsRef?.current ?? [])));
  };

  useAppEventsHandler({
    itemElementsRef,
  }, {
    [CustomAppEventEnum.APP_STARTED]: handleAppStarted,
  });

  useAppManager({
    activeLevel,
  });

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
    setActiveLevel,
    // updateLocalSettings,
    layoutConfig,
  }: LayoutManagerType = useLayoutManager({
    activeLevel,
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

          {itemRects?.map((arr: [string, number, number, number, number]) => {
            const [
              id,
              left,
              top,
              width,
              height,
            ] = arr;
            const item = itemsRef.current[id];
            if (!item) return;

            return (
              <DraggableBlockNode
                handlers={{
                  onDragEnd: handleDragEnd,
                  onDragStart: handleDragStart,
                  onDrop: onDropPort,
                  onMouseDown: handleMouseDown,
                }}
                item={item as NodeItemType}
                key={arr.join(':')}
                onMountItem={(item: DragItem, ref: React.RefObject<HTMLDivElement>) => {
                  onMountItem(item, ref);
                  removeComponentById(id);
                }}
                onMountPort={onMountPort}
                rect={{
                  height,
                  left,
                  top,
                  width,
                }}
                submitEventOperation={submitEventOperation}
              />
            );
          })}

          {appNodes?.map((appNode: AppNodeType) => (
            <DraggableAppNode
              items={appNode?.upstream?.map(id => itemsRef?.current?.[id])}
              key={appNode.id}
              node={appNode}
            />
          ))}
        </CanvasContainer>
      </div>
    </div>
  );
};

export default BuilderCanvas;
