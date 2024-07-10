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
  const [rectsMapping, setRectsMapping] = useState<Record<string, RectType>>({});
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
      style: LayoutStyleEnum.SPIRAL,
    }),
  ]);
  const [defaultGroups, setDefaultGroups] = useState<any>(null);
  const [selectedGroups, setSelectedGroups] = useState<MenuGroupType[]>(
    getCache([executionFrameworkUUID, pipelineUUID].join(':')));
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
  const displayableGroups = useMemo(() => [currentGroup, parentGroup, ...(siblingGroups ?? [])], [
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
    const blockNodes = hydrateBlockNodeRects(Object.entries(rectRefs.current ?? {}).map(([id, rectRef]) => {
      const rect = rectRef.current;

      return {
        block: blockMapping[id],
        node: {
          type: rect.type,
        },
        rect,
      }
    }), blocksByGroup);

    const tfs = transformRects(blockNodes, transformations)
    setRectsMapping(indexBy(tfs, r => r.id));
  }, [blockMapping, blocksByGroup, transformations]);

  useEffect(() => {
    if (framework === null && frameworkMutants.detail.isIdle) {
      frameworkMutants.detail.mutate();
    }
    if (pipeline === null && pipelineMutants.detail.isIdle) {
      pipelineMutants.detail.mutate();
    }
  }, [framework, frameworkMutants, pipeline, pipelineMutants]);

  const renderNodeData = useCallback((
    block: PipelineExecutionFrameworkBlockType & BlockType,
    type: ItemTypeEnum,
    index: number,
  ) => {
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
      ref: nodeRef,
      target: (
        <DragWrapper
          // draggable={draggable}
          // droppable={droppable}
          // droppableItemTypes={droppableItemTypes}
          // eventHandlers={eventHandlers}
          // handleDrop={handleDrop}
          item={node as NodeType}
          key={block.uuid}
          rect={rectsMapping?.[block.uuid] ?? {
            left: undefined,
            top: undefined,
          }}
          ref={dragRef}
        />
      ),
      targetRef: dragRef,
    };
  }, [rectsMapping]);

  console.log('rendering...');

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
              <ShadowRenderer
                handleDataCapture={({ data, id }, { rect }) => {
                  updateRects({ [id]: { data, rect } });
                }}
                nodes={blocks?.map((block: BlockType, index: number) =>
                  renderNodeData(block as any, ItemTypeEnum.BLOCK, index))
                }
              />

              {/* {displayableGroups?.map((block: FrameworkType, index: number) =>
                renderNode(block as any, ItemTypeEnum.NODE, index))} */}
            </ModelProvider>
          </SettingsProvider>
        </CanvasContainer>
      </div>

      {headerData && <HeaderUpdater {...headerData as any} />}
    </div>
  );
}

export default PipelineCanvasV2;
