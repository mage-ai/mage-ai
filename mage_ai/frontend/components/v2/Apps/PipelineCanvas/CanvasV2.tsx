import BlockNodeV2 from '../../Canvas/Nodes/BlockNodeV2';
import BlockType from '@interfaces/BlockType';
import CanvasContainer, { GRID_SIZE } from './index.style';
import DragWrapper from '../../Canvas/Nodes/DragWrapper';
import HeaderUpdater from '../../Layout/Header/Updater';
import PipelineExecutionFrameworkType, { ConfigurationType, FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from '@interfaces/PipelineType';
import { ExecutionManagerType } from '../../ExecutionManager/interfaces';
import { ItemTypeEnum } from '@components/v2/Canvas/types';
import { LayoutConfigType, RectType } from '@components/v2/Canvas/interfaces';
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
  const rectRefs = useRef<Record<string, React.MutableRefObject<RectType>>>({});
  const wrapperRef = useRef(null);

  // State store
  const [layoutConfigs, setLayoutConfigs] = useState<LayoutConfigType[]>([]);
  const [defaultGroups, setDefaultGroups] = useState<any>(null);
  const [selectedGroups, setSelectedGroups] = useState<MenuGroupType[]>(
    getCache([executionFrameworkUUID, pipelineUUID].join(':')));

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
    let rectRef = rectRefs.current[block.uuid];
    if (!rectRef) {
      rectRef = createRef();
      rectRefs.current[block.uuid] = rectRef;
      rectRef.current = {
        height: 0,
        left: 0,
        top: 0,
        width: 0,
      };
    }

    const node = {
      id: block.uuid,
      type,
    };

    return {
      component: (
        <BlockNodeV2
          block={block}
          index={index}
          key={block.uuid}
          node={node}
          rectRef={rectRef}
          ref={nodeRef}
        />
      ),
      data: {
        node,
        rectRef,
      },
      id: block.uuid,
      ref: nodeRef,
    };
  }, []);

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
                handleDataCapture={(node, { rect }) => {
                  rectRefs.current[node.id].current = {
                    height: rect.height,
                    left: 500,
                    top: 500,
                    width: rect.width,
                  };
                }}
                nodes={blocks?.map((block: BlockType, index: number) =>
                  renderNodeData(block as any, ItemTypeEnum.BLOCK, index))}
                renderNode={({
                  component,
                  data: {
                    node,
                    rectRef,
                  },
                  id,
                }) => (
                  <DragWrapper
                    // draggable={draggable}
                    // droppable={droppable}
                    // droppableItemTypes={droppableItemTypes}
                    // eventHandlers={eventHandlers}
                    // handleDrop={handleDrop}
                    item={node}
                    key={id}
                    rect={rectRef.current}
                  >
                    {component}
                  </DragWrapper>
                )}
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
