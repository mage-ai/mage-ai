import update from 'immutability-helper';
import DraggableAppNode from '../../Canvas/Nodes/Apps/DraggableAppNode';
import { ClientEventType } from '@mana/shared/interfaces';
import DraggableBlockNode from '../../Canvas/Nodes/DraggableBlockNode';
import OutputNode from '../../Canvas/Nodes/CodeExecution/OutputNode';
import CanvasContainer from './index.style';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import type { DropTargetMonitor } from 'react-dnd';
import {
  LayoutConfigType, DragItem, ModelMappingType, NodeItemType, RectType,
  NodeType, FlatItemType,
  AppNodeType,
  OutputNodeType
} from '../../Canvas/interfaces';
import useEventManager from './useEventManager';
import useLayoutManager from './useLayoutManager';
import useModelManager from './useModelManager';
import usePresentationManager, { PresentationManagerType } from './usePresentationManager';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { ItemTypeEnum, LayoutConfigDirectionOriginEnum, LayoutConfigDirectionEnum } from '../../Canvas/types';
import { RemoveContextMenuType, RenderContextMenuType } from '@mana/hooks/useContextMenu';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { snapToGrid } from '../../Canvas/utils/snapToGrid';
import { useDrop } from 'react-dnd';
import { createRef, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import useItemManager from './useItemManager';
import useDynamicDebounce from '@utils/hooks/useDebounce';
import { buildOutputNode } from './utils/items';
import { AppManagerType, LayoutManagerType, ItemElementsType, EventManagerType, ModelManagerType } from './interfaces';
import { groupBy, unique, sortByKey, flattenArray } from '@utils/array';
import useNodeManager from './useNodeManager';
import useAppManager from './useAppManager';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { DEBUG } from '@components/v2/utils/debug';
import { ExecutionManagerType } from '@components/v2/ExecutionManager/interfaces';
import BlockType from '@interfaces/BlockType';

export type BuilderCanvasProps = {
  canvasRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  defaultActiveLevel?: number;
  dragEnabled?: boolean;
  dropEnabled?: boolean;
  executionFrameworkUUID: string;
  pipelineUUID: string;
  removeContextMenu: RemoveContextMenuType;
  renderContextMenu: RenderContextMenuType;
  setDragEnabled: (value: boolean) => void;
  setDropEnabled: (value: boolean) => void;
  setZoomPanDisabled: (value: boolean) => void;
  snapToGridOnDrop?: boolean;
  transformState: React.MutableRefObject<ZoomPanStateType>;
  useExecuteCode: ExecutionManagerType['useExecuteCode'];
  useRegistration: ExecutionManagerType['useRegistration'];
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
  executionFrameworkUUID,
  pipelineUUID,
  removeContextMenu,
  renderContextMenu,
  setDragEnabled,
  setDropEnabled,
  setZoomPanDisabled,
  snapToGridOnDrop = true,
  transformState,
  useExecuteCode,
  useRegistration,
}: BuilderCanvasProps) => {
  DEBUG.rendering && console.log('Rendering Canvas');

  const activeLevel = useRef<number>(null);
  const itemElementsRef = useRef<ItemElementsType>({
    [ItemTypeEnum.APP]: {},
    [ItemTypeEnum.BLOCK]: {},
    [ItemTypeEnum.NODE]: {},
    [ItemTypeEnum.OUTPUT]: {},
    [ItemTypeEnum.PORT]: {},
  });
  const itemIDsByLevelRef = useRef<string[][]>(null);
  const phaseRef = useRef<number>(0);
  const wrapperRef = useRef(null);

  // VERY IMPORTANT THAT THE STATE IS IN THIS COMPONENT OR ELSE NOTHING WILL RENDER!
  const [pipeline, setPipeline] = useState<PipelineExecutionFrameworkType>(null);
  const [executionFramework, setExecutionFramework] = useState<PipelineExecutionFrameworkType>(null);
  const [appRects, setAppRects] = useState<{
    mapping: Record<string, AppNodeType>;
    rects: FlatItemType[];
  }>({
    mapping: {},
    rects: [],
  });
  const [outputIDs, setOutputIDs] = useState<string[]>([]);
  const [itemRects, _setItemRects] = useState<FlatItemType[]>([]);
  const outputPortalRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});

  const { dispatchAppEvent } = useAppEventsHandler(null, {
    [CustomAppEventEnum.APP_STARTED]: handleAppChanged,
    [CustomAppEventEnum.APP_STOPPED]: handleAppChanged,
    [CustomAppEventEnum.APP_UPDATED]: handleAppChanged,
    [CustomAppEventEnum.NODE_LAYOUTS_CHANGED]: handleNodeLayoutsChanged,
  });

  function handleNodeLayoutsChanged({ detail }: CustomAppEvent) {
    const { nodes } = detail;

    DEBUG.state && console.log('setItemRects', nodes);

    const buildFlatItem = ({ id, rect }: NodeItemType): FlatItemType => {
      const { left, top, width, height } = rect ?? {};
      return [String(id), left, top, width, height];
    };

    const outputs = [];
    const flats = [];
    nodes?.forEach((node: NodeItemType) => {
      outputs.push(...(node.outputs ?? []));
      flats.push(buildFlatItem(node));
    });

    startTransition(() => {
      _setItemRects(flats);
    });
  }

  function handleAppChanged({ detail: { manager } }: CustomAppEvent) {
    const mapping = {};
    const rects = [];

    Object.values((manager as AppManagerType)?.appsRef?.current ?? {})?.forEach((appNodes: AppNodeType[]) => {
      appNodes?.forEach((appNode: AppNodeType) => {
        const { id, rect } = appNode;
        const { left, top, width, height } = rect ?? {};

        const flat = [String(id), left, top, width, height];

        rects.push(flat);
        mapping[flat[0]] = appNode;
      });
    });

    DEBUG.apps && console.log('handleAppChanged', { mapping, rects });
    DEBUG.state && console.log('setAppRects', rects);
    setAppRects({ mapping, rects });
  }

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
    itemIDsByLevelRef,
    pipelineUUID,
    setOutputIDs,
  });

  const {
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
    transformState,
  });

  const { onMountItem } = useItemManager({ itemElementsRef, itemsRef });

  const {
    addNewComponent,
    dynamicRootRef,
    removeComponentById,
  } = useNodeManager({
    itemRects,
    itemElementsRef,
    dragEnabled,
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
      accept: [ItemTypeEnum.APP, ItemTypeEnum.BLOCK, ItemTypeEnum.NODE, ItemTypeEnum.OUTPUT, ItemTypeEnum.PORT],
      canDrop: (node: NodeItemType, monitor: DropTargetMonitor) => {
        if (!monitor.isOver({ shallow: true })) {
          return false;
        }

        return true;
      },
      drop: (item: DragItem, monitor: DropTargetMonitor) => {
        const delta = monitor.getDifferenceFromInitialOffset() as {
          x: number;
          y: number;
        };

        // let left = Math.round(node?.rect?.left + delta.x);
        // let top = Math.round(node?.rect?.top + delta.y);
        let left = Math.round((item?.rect?.left ?? 0) + delta.x);
        let top = Math.round((item?.rect?.top ?? 0) + delta.y);

        // Prevents the item from being dragged outside the screen but the screen is larger
        // because of the zooming and panning.
        // const screenX = window.innerWidth;
        // const screenY = window.innerHeight;
        // const itemWidth = node?.rect?.width;
        // const itemHeight = node?.rect?.height;

        // if (left < 0) left = 0;
        // if (top < 0) top = 0;
        // if (left + itemWidth > screenX) left = screenX - itemWidth;
        // if (top + itemHeight > screenY) top = screenY - itemHeight;

        let leftOffset = 0;
        let topOffset = 0;
        if (snapToGridOnDrop) {
          // TODO (dangerous): This doesn’t apply to the ports; need to handle that separately.
          const [xSnapped, ySnapped] = snapToGrid(
            {
              x: left,
              y: top,
            },
            { height: gridDimensions.current.height, width: gridDimensions.current.width },
          );
          leftOffset = xSnapped - left;
          topOffset = ySnapped - top;
        }

        left += leftOffset;
        top += topOffset;

        const node = { ...item };
        const rect2 = {
          ...item?.rect,
          left: left,
          top: top,
        };
        node.rect = rect2;

        const element = itemElementsRef.current[node.type][node.id].current;
        if (element) {
          element.style.transform = `translate(${left}px, ${top}px)`;
        }

        dispatchAppEvent(CustomAppEventEnum.NODE_DROPPED, {
          event: {
            data: {
              node,
            },
          } as ClientEventType,
          options: {
            kwargs: {
              rect: {
                left,
                offset: {
                  left: leftOffset,
                  top: topOffset,
                },
                top,
              },
            },
          },
        });

        return undefined;
      },
      // hover: onDragInit,
    }),
    [],
  );
  connectDrop(canvasRef);

  const handlers = useMemo(() => ({
    appHandlersRef,
    handlers: {
      onDragEnd: handleDragEnd,
      onDragStart: handleDragStart,
      onDrop: onDropPort,
      onMouseDown: handleMouseDown,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

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
            DEBUG.layout && console.log('[Canvas] Rendering itemRects', arr);
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
                {...handlers}
                active={activeLevel.current === item?.level}
                draggable={dragEnabled}
                key={arr.join(':')}
                node={item as NodeItemType}
                rect={{
                  height,
                  left,
                  top,
                  width,
                }}
                submitEventOperation={submitEventOperation}
                useExecuteCode={useExecuteCode}
                useRegistration={useRegistration}
              />
            );
          })}

          {outputIDs?.map((id: string) => {
            const key = `output-${id}`;
            const portalRef = outputPortalRefs.current[key] || createRef();
            outputPortalRefs.current[key] = portalRef;

            return (
              <div key={key} id={key} ref={portalRef} />
            )
          })}

          {appRects?.rects?.map((arr) => {
            const [
              id,
              left,
              top,
              width,
              height,
            ] = arr;
            const appNode = appRects?.mapping?.[id];
            if (!appNode) return;
            DEBUG.apps && console.log('appRect rendering', id, left, top, width, height, appNode);

            return (
              <DraggableAppNode
                {...handlers}
                blocks={(appNode?.upstream?.map(
                  (id: string) => itemsRef?.current?.[id]?.block as BlockType) as BlockType[])}
                draggable={dragEnabled}
                key={appNode.id}
                node={appNode}
                rect={{
                  height,
                  left,
                  top,
                  width,
                }}
              />
            );
          })}
        </CanvasContainer>
      </div>
    </div>
  );
};

export default BuilderCanvas;