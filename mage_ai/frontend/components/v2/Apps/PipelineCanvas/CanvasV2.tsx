import BlockNodeV2 from '../../Canvas/Nodes/BlockNodeV2';
import { transformRects } from '../../Canvas/utils/rect';
import {
  ItemTypeEnum, LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum, LayoutDisplayEnum, LayoutStyleEnum,
} from '../../Canvas/types';
import BlockType from '@interfaces/BlockType';
import CanvasContainer, { GRID_SIZE } from './index.style';
import DragWrapper from '../../Canvas/Nodes/DragWrapper';
import HeaderUpdater from '../../Layout/Header/Updater';
import PipelineExecutionFrameworkType,
{ ConfigurationType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { hydrateBlockNodeRects, buildRectTransformations } from './Layout/utils';
import PipelineType from '@interfaces/PipelineType';
import { ExecutionManagerType } from '../../ExecutionManager/interfaces';
import { LayoutConfigType, NodeType, RectType } from '@components/v2/Canvas/interfaces';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { ModelProvider } from './ModelManager/ModelContext';
import { RemoveContextMenuType, RenderContextMenuType } from '@mana/hooks/useContextMenu';
import { SettingsProvider } from './SettingsManager/SettingsContext';
import { ShadowRenderer } from '@mana/hooks/useShadowRender';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { buildDependencies } from './utils/pipelines';
import { createRef, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getCache } from '@mana/components/Menu/storage';
import { useMutate } from '@context/APIMutation';
import { indexBy } from '@utils/array';
import { getNewUUID } from '@utils/string';

export type PipelineCanvasV2Props = {
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

const PipelineCanvasV2: React.FC<PipelineCanvasV2Props> = ({
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
  snapToGridOnDrop = false,
  transformState,
  useExecuteCode,
  useRegistration,
}: PipelineCanvasV2Props) => {
  // Refs
  const nodeRefs = useRef<Record<string, React.MutableRefObject<HTMLElement>>>({});
  const dragRefs = useRef<Record<string, React.MutableRefObject<HTMLDivElement>>>({});
  const rectRefs = useRef<Record<string, React.MutableRefObject<RectType>>>({});
  const wrapperRef = useRef(null);
  const timeoutRef = useRef(null);

  function defaultLayoutConfig(override?: Partial<LayoutConfigType>) {
    return {
      containerRef,
      direction: LayoutConfigDirectionEnum.VERTICAL,
      display: LayoutDisplayEnum.SIMPLE,
      gap: { column: 40, row: 40 },
      origin: LayoutConfigDirectionOriginEnum.LEFT,
      rectTransformations: null,
      viewportRef: canvasRef,
      ...override,
    };
  }
  // State store
  const rectsMappingRef = useRef<Record<string, RectType>>({});
  const [layoutConfigs, setLayoutConfigs] = useState<LayoutConfigType[]>([
    defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.VERTICAL,
    }),
    defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.VERTICAL,
    }),
    defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
      display: LayoutDisplayEnum.SIMPLE,
      style: LayoutStyleEnum.WAVE,
    }),
    defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
      display: LayoutDisplayEnum.DETAILED,
      style: LayoutStyleEnum.WAVE,
    }),
  ]);
  const [defaultGroups, setDefaultGroups] = useState<any>(null);
  const [selectedGroups, setSelectedGroups] = useState<MenuGroupType[]>(null);
  const transformations = useMemo(() => buildRectTransformations({
    containerRef: canvasRef,
    layoutConfig: layoutConfigs?.[layoutConfigs?.length - 1],
    selectedGroup: selectedGroups?.[selectedGroups?.length - 1],
  }), [canvasRef, layoutConfigs, selectedGroups]);

  // Resources
  const [pipeline, setPipeline] = useState<PipelineExecutionFrameworkType>(null);
  const [framework, setFramework] = useState<PipelineExecutionFrameworkType>(null);
  const pipelineMutants = useMutate({
    id: pipelineUUID,
    idParent: executionFrameworkUUID,
    resource: 'pipelines',
    resourceParent: 'execution_frameworks',
  }, {
    automaticAbort: false,
    handlers: {
      detail: { onSuccess: setPipeline },
      update: { onSuccess: model => setPipeline(model) },
    },
  });
  const frameworkMutants = useMutate({
    id: executionFrameworkUUID,
    resource: 'execution_frameworks',
  }, {
    automaticAbort: false,
    handlers: {
      detail: { onSuccess: setFramework },
    },
  });
  const fileMutants = useMutate({
    resource: 'browser_items',
  });

  const { blocksByGroup, blockMapping, groupMapping, groupsByLevel } = useMemo(() =>
    buildDependencies(framework, pipeline), [framework, pipeline]);

  const headerData = useMemo(() => ({
    ...(defaultGroups ? { defaultGroups } : {}),
    executionFramework: framework,
    groupsByLevel,
    handleMenuItemClick: (event: MouseEvent, groups: MenuGroupType[]) => setSelectedGroups(groups),
    pipeline,
  }), [defaultGroups, framework, groupsByLevel, pipeline]);

  // Models
  const currentGroup = useMemo(() => selectedGroups?.[selectedGroups?.length - 1], [selectedGroups]);
  const parentGroup = useMemo(() => selectedGroups?.[selectedGroups?.length - 2], [selectedGroups]);
  const siblingGroups = useMemo(() =>
    groupMapping?.[parentGroup?.uuid]?.children?.filter(g => g.uuid !== currentGroup?.uuid),
    [currentGroup, groupMapping, parentGroup]);
  const blocks = useMemo(() =>
    Object.values(blocksByGroup?.[currentGroup?.uuid] ?? {}) ?? [], [blocksByGroup, currentGroup]);
  const displayableGroups =
    useMemo(() => [currentGroup, parentGroup, ...(siblingGroups ?? [])].filter(g => g ?? false), [
      currentGroup, parentGroup, siblingGroups]);

  const updateRects = useCallback((rectData: Record<string, {
    data: {
      node: {
        type: ItemTypeEnum;
      };
    };
    rect: RectType;
  }>) => {
    Object.entries(rectData).forEach(([id, info]) => {
      if (!rectRefs.current[id]) {
        rectRefs.current[id] = createRef();
      }
      const { data, rect } = info;
      rectRefs.current[id].current = {
        height: rect.height,
        left: undefined,
        top: undefined,
        type: data.node.type,
        width: rect.width,
      };
    });

    const updateState = () => {
      const blockNodes = Object.entries(rectRefs.current ?? {}).map(([id, rectRef]) => {
        const rect = rectRef.current;
        const { type } = rect;

        let block = null;
        if (ItemTypeEnum.BLOCK === type) {
          block = blockMapping[id] ?? groupMapping[id];
        } else {
          block = groupMapping[id] ?? blockMapping[id];
        }
        return {
          block,
          node: {
            type: rect.type,
          },
          rect,
        }
      });
      const blockNodeMapping = indexBy(blockNodes, bn => bn?.block?.uuid);
      const rects = hydrateBlockNodeRects(blockNodes, blockNodeMapping);
      const tfs = transformRects(rects, transformations);

      rectsMappingRef.current = indexBy(tfs, r => r.id);
    };

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(updateState, 100);
  }, [blockMapping, groupMapping, transformations]);

  useEffect(() => {
    if (framework === null && frameworkMutants.detail.isIdle) {
      frameworkMutants.detail.mutate();
    }
    if (pipeline === null && pipelineMutants.detail.isIdle) {
      pipelineMutants.detail.mutate();
    }
    if (selectedGroups === null && (framework ?? false) && (pipeline ?? false)) {
      setSelectedGroups(getCache([framework.uuid, pipeline.uuid].join(':')))
    }
  }, [framework, frameworkMutants, pipeline, pipelineMutants, selectedGroups]);

  function renderNodeData(
    block: PipelineExecutionFrameworkBlockType & BlockType,
    type: ItemTypeEnum,
    index: number,
  ) {
    console.log(`[Canvas:${type}] renderNodeData:`, block.uuid);

    let nodeRef = nodeRefs.current[block.uuid];
    if (!nodeRef) {
      nodeRef = createRef();
      nodeRefs.current[block.uuid] = nodeRef;
    }
    let dragRef = dragRefs.current[block.uuid];
    if (!dragRef) {
      dragRef = createRef();
      dragRefs.current[block.uuid] = dragRef;
    }

    const node = {
      block,
      id: block.uuid,
      type,
    };

    return {
      component: (
        <BlockNodeV2
          block={block}
          index={index}
          key={block.uuid}
          node={node as NodeType}
          ref={nodeRef}
        />
      ),
      data: {
        node,
      },
      id: block.uuid,
      onCapture: (_node: any, _data: any, element: HTMLElement) => {
        element.classList.add('captured');
      },
      ref: nodeRef,
      shouldCapture: (_node: any, element: HTMLElement) => !(block.uuid in rectsMappingRef.current),
      target: (
        <DragWrapper
          // draggable={draggable}
          // droppable={droppable}
          // droppableItemTypes={droppableItemTypes}
          // eventHandlers={eventHandlers}
          // handleDrop={handleDrop}
          item={node as NodeType}
          key={block.uuid}
          rect={rectsMappingRef.current?.[block.uuid] ?? {
            left: undefined,
            top: undefined,
          }}
          ref={dragRef}
        />
      ),
      targetRef: dragRef,
    };
  }

  const renderer = useMemo(() => blocks?.length > 0 && (
    <ShadowRenderer
      handleDataCapture={({ data, id }, { rect }) => {
        updateRects({ [id]: { data, rect } });
      }}
      nodes={blocks?.map((block: BlockType, index: number) =>
        renderNodeData(block as any, ItemTypeEnum.BLOCK, index))
      }
      uuid={`blocks-${getNewUUID(3, 'clock')}`}
    />
  ), [blocks]);
  const rendererGroups = useMemo(() => displayableGroups?.length > 0 && (
    <ShadowRenderer
      handleDataCapture={({ data, id }, { rect }) => {
        updateRects({ [id]: { data, rect } });
      }}
      nodes={displayableGroups?.map((block: BlockType, index: number) =>
        renderNodeData(block as any, ItemTypeEnum.NODE, index))
      }
      uuid={`groups-${getNewUUID(3, 'clock')}`}
    />
  ), [displayableGroups]);

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
        ref={canvasRef}
        style={{
          height: 'inherit',
          overflow: 'inherit',
          position: 'inherit',
          width: 'inherit',
        }}
      >
        <CanvasContainer ref={containerRef}>
          <SettingsProvider
            layoutConfigs={{ current: layoutConfigs?.map(config => ({ current: config })) }}
            selectedGroupsRef={{ current: selectedGroups }}
          >
            <ModelProvider
              blockMappingRef={{ current: blockMapping }}
              blocksByGroupRef={{ current: blocksByGroup }}
              groupMappingRef={{ current: groupMapping }}
              groupsByLevelRef={{ current: groupsByLevel }}
            >
              {renderer}
              {rendererGroups}
            </ModelProvider>
          </SettingsProvider>
        </CanvasContainer>
      </div>

      {headerData && <HeaderUpdater {...headerData as any} />}
    </div>
  );
}

export default PipelineCanvasV2;
