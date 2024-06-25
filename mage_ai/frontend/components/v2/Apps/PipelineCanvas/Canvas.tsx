import BlockNodeWrapper from '../../Canvas/Nodes/BlockNodeWrapper';
import CanvasContainer from './index.style';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from '@interfaces/PipelineType';
import type { DropTargetMonitor } from 'react-dnd';
import { DragItem, NodeItemType, NodeType, GroupMappingType, ItemMappingType,
PortMappingType } from '../../Canvas/interfaces';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { ItemTypeEnum } from '../../Canvas/types';
import { RemoveContextMenuType, RenderContextMenuType } from '@mana/hooks/useContextMenu';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { buildDependencies } from './utils/pipelines';
import { useDrop } from 'react-dnd';
import { useEffect, useMemo, useRef, startTransition } from 'react';
import useLayoutManager, { LayoutManagerType } from './useLayoutManager';
import useModelManager, { ModelManagerType } from './useModelManager';
import useEventManager, { EventManagerType } from './useEventManager';
import usePresentationManager, { PresentationManagerType } from './usePresentationManager';
import { initializeBlocksAndConnections } from './utils/blocks';

export type BuilderCanvasProps = {
  canvasRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  dragEnabled?: boolean;
  dropEnabled?: boolean;
  pipeline: PipelineType | PipelineExecutionFrameworkType;
  pipelineExecutionFramework: PipelineExecutionFrameworkType;
  pipelineExecutionFrameworks: PipelineExecutionFrameworkType[];
  pipelines?: PipelineType[];
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
  pipelineExecutionFramework,
  pipelineExecutionFrameworks,
  pipelines,
  removeContextMenu,
  renderContextMenu,
  setDragEnabled,
  setDropEnabled,
  setZoomPanDisabled,
  transformState,
}: BuilderCanvasProps) => {
  const phaseRef = useRef<number>(0);
  const wrapperRef = useRef(null);

  const {
    blocksByGroupRef,
    frameworkGroupsRef,
    groupLevelsMappingRef,
    itemsRef,
    mutateModels,
    portsRef,
    updateNodeItems,
    updatePorts,
  }: ModelManagerType = useModelManager();

  const {
    activeLevel,
    items,
    layoutConfig,
    modelLevelsMapping,
    renderLayoutChanges,
    setActiveLevel,
    updateLayoutOfItems,
  }: LayoutManagerType = useLayoutManager({
    canvasRef,
    containerRef,
    itemsRef,
    transformState,
    updateNodeItems,
  });

  const {
    connectionLinesPathRef,
    connectionLinesRootID,
    itemDraggingRef,
    itemElementsRef,
    itemsMetadataRef,
    onMountItem,
    onMountPort,
    renderConnectionLines,
    updateItemsMetadata,
  }: PresentationManagerType = usePresentationManager({
    activeLevel,
    itemsRef,
    layoutConfig,
    modelLevelsMapping,
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
    onDragInit,
    onDragging,
    onDropBlock,
    onDropPort,
    resetAfterDrop,
    setSnapToGridOnDrag,
    setSnapToGridOnDrop,
    snapToGridOnDrag,
    snapToGridOnDrop,
    submitEventOperation,
  }: EventManagerType = useEventManager({
    canvasRef,
    connectionLinesPathRef,
    containerRef,
    itemDraggingRef,
    itemElementsRef,
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
    if (phaseRef.current === 0) {
      const { blockMapping, blocksByGroup, groupLevelsMapping, groupMapping } = buildDependencies(
        pipelineExecutionFramework,
        pipelineExecutionFrameworks,
        pipeline,
        pipelines,
      );

      const boundingRect = canvasRef?.current?.getBoundingClientRect();
      const rectCon = containerRef?.current?.getBoundingClientRect();
      const layout = {
        layout: {
          ...layoutConfig,
          boundingRect,
          containerRect: rectCon,
        },
      };

      // Presentation
      // updateItemsMetadata();

      // Framework
      blocksByGroupRef.current = blocksByGroup;
      groupLevelsMappingRef.current = groupLevelsMapping;
      frameworkGroupsRef.current = groupMapping;

      // Models
      groupLevelsMappingRef?.current?.forEach((groupMapping: GroupMappingType, level: number) => {
        modelLevelsMapping.current.push(
          initializeBlocksAndConnections(
            Object.values(groupMapping),
            {
              groupMapping: level >= 1 ? groupLevelsMappingRef?.current?.[level - 1] : undefined,
            },
            {
              layout,
              level,
            } as any,
          ),
        );
      });

      const finalLevel = modelLevelsMapping.current.length;
      modelLevelsMapping.current.push(
        initializeBlocksAndConnections(
          Object.values(blockMapping),
          {
            groupMapping:
              finalLevel >= 1 ? groupLevelsMappingRef?.current?.[finalLevel - 1] : undefined,
          },
          {
            ...layout,
            level: finalLevel,
          },
        ),
      );

      startTransition(() => {
        const { itemMapping, portMapping } = modelLevelsMapping.current.reduce(
          (acc, mapping) => {
            const { itemMapping, portMapping } = mapping;

            return {
              itemMapping: {
                ...acc.itemMapping,
                ...itemMapping,
              },
              portMapping: {
                ...acc.portMapping,
                ...portMapping,
              },
            };
          },
          {
            itemMapping: {} as ItemMappingType,
            portMapping: {} as PortMappingType,
          },
        );

        mutateModels({
          itemMapping,
          portMapping,
        });

        renderLayoutChanges({ items: itemsRef?.current });
      });
    }

    phaseRef.current += 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        frameworkGroups={frameworkGroupsRef?.current}
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

          <div
            id={connectionLinesRootID.current}
            style={{
              height: '100%',
              pointerEvents: 'none',
              position: 'absolute',
              width: '100%',
              zIndex: 5,
            }}
          />

          {nodesMemo}
        </CanvasContainer>
      </div>
    </div>
  );
};

export default BuilderCanvas;
