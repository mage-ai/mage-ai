import BlockNodeV2 from '../../Canvas/Nodes/BlockNodeV2';
import { calculateBoundingBox, logMessageForRects } from '../../Canvas/utils/layout/shared';
import { transformRects } from '../../Canvas/utils/rect';
import {
  ItemTypeEnum, LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum, LayoutDisplayEnum, LayoutStyleEnum,
} from '../../Canvas/types';
import BlockType from '@interfaces/BlockType';
import CanvasContainer, { GRID_SIZE } from './index.style';
import LineManagerV2 from './Lines/LineManagerV2';
import DragWrapper from '../../Canvas/Nodes/DragWrapper';
import HeaderUpdater from '../../Layout/Header/Updater';
import PipelineExecutionFrameworkType,
{ FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { hydrateBlockNodeRects, buildRectTransformations } from './Layout/utils';
import PipelineType from '@interfaces/PipelineType';
import { ExecutionManagerType } from '../../ExecutionManager/interfaces';
import {
  BlockMappingType, BlocksByGroupType, GroupLevelType, GroupMappingType, LayoutConfigType,
  NodeType, RectType
} from '@components/v2/Canvas/interfaces';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { ModelProvider } from './ModelManager/ModelContext';
import { RemoveContextMenuType, RenderContextMenuType } from '@mana/hooks/useContextMenu';
import { SettingsProvider } from './SettingsManager/SettingsContext';
import { ShadowNodeType, ShadowRenderer } from '@mana/hooks/useShadowRender';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { buildDependencies } from './utils/pipelines';
import { createRef, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getCache } from '@mana/components/Menu/storage';
import { useMutate } from '@context/APIMutation';
import { indexBy, unique } from '@utils/array';
import { getNewUUID } from '@utils/string';

const GROUP_NODE_PADDING = 16;

type ModelsType = Record<string, {
  blocks: BlockType[];
  groups: FrameworkType[];
}>;

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

  // Settings
  function defaultLayoutConfig(override?: Partial<LayoutConfigType>) {
    return {
      containerRef,
      direction: LayoutConfigDirectionEnum.VERTICAL,
      display: LayoutDisplayEnum.SIMPLE,
      gap: { column: 40, row: 40 },
      origin: LayoutConfigDirectionOriginEnum.LEFT,
      rectTransformations: null,
      style: LayoutStyleEnum.WAVE,
      viewportRef: canvasRef,
      ...override,
    };
  }
  const layoutConfigsRef = useRef<LayoutConfigType[]>([
    defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
      style: LayoutStyleEnum.WAVE,
    }),
    defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
      display: LayoutDisplayEnum.SIMPLE,
      rectTransformations: [],
      style: LayoutStyleEnum.WAVE,
    }),
    defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.VERTICAL,
      display: LayoutDisplayEnum.DETAILED,
      style: LayoutStyleEnum.TREE,
    }),
  ]);
  const layoutConfigChildrenRef = useRef<LayoutConfigType>([
    defaultLayoutConfig({

    }),
    defaultLayoutConfig({

    }),
    defaultLayoutConfig({

    }),
  ]);

  // Immutable store
  const selectedGroupsRef = useRef<MenuGroupType[]>(null);
  const blocksByGroupRef = useRef<BlocksByGroupType>(null);
  const blockMappingRef = useRef<BlockMappingType>(null);
  const groupMappingRef = useRef<GroupMappingType>(null);
  const groupsByLevelRef = useRef<GroupLevelType>(null);
  const blocksRef = useRef<BlockType[]>(null);
  const groupsRef = useRef<FrameworkType[]>(null);
  const rectsMappingRef = useRef<Record<string, RectType>>({});

  // State store
  const [defaultGroups, setDefaultGroups] = useState<any>(null);
  const [models, setModels] = useState<ModelsType>(null);
  const [rectsMapping, setRectsMapping] = useState<Record<string, RectType>>({});
  const [renderer, setRenderer] = useState<React.ReactNode>(null);

  function renderNodeData(
    block: PipelineExecutionFrameworkBlockType & BlockType,
    type: ItemTypeEnum,
    index: number,
  ): ShadowNodeType {
    console.log(`[Canvas:${type}] renderNodeData:`, block.uuid);

    let nodeRef = nodeRefs.current[block.uuid];
    if (!nodeRef) {
      nodeRef = createRef();
      nodeRefs.current[block.uuid] = nodeRef;
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
      onCapture: (_node: ShadowNodeType, _data: any, element: HTMLElement) => {
        element.classList.add('captured');
      },
      ref: nodeRef,
      shouldCapture: (_node: ShadowNodeType, element: HTMLElement) => {
        const valid = !(block.uuid in rectsMappingRef.current);
        // console.log('shouldCapture', block.uuid, valid);
        return valid;
      },
      targetRef: (node: ShadowNodeType) => dragRefs.current[node.id],
    };
  }

  const setSelectedGroupsRef = useRef((groupsArg: MenuGroupType[]) => {
    selectedGroupsRef.current = groupsArg;

    const currentGroup = groupsArg?.[groupsArg?.length - 1];
    const group = groupMappingRef.current?.[currentGroup?.uuid];
    const parentGroup = groupsArg?.[groupsArg?.length - 2];
    const siblingGroups = groupMappingRef.current?.[parentGroup?.uuid]?.children?.filter(
      g => g.uuid !== currentGroup?.uuid);

    const blocks =
      (Object.values(blocksByGroupRef.current?.[currentGroup?.uuid] ?? {}) ?? []) as BlockType[];

    const groupsForEmptySelection = [];
    if ((groupsArg?.length ?? 0) === 0) {
      // No group selected: show top level pipelines (e.g. data preparation, inference)
      const defaultSelectionGroups = groupsByLevelRef.current?.[0];
      selectedGroupsRef.current = [
        {
          items: defaultSelectionGroups,
          level: 0,
        },
      ];
      groupsForEmptySelection.push(...defaultSelectionGroups);
    }

    const groups = (group?.children ?? []).concat(
      [
        // Should we show the parent group as well?
        // parentGroup,
        // Add the current group so we can show groupings within it.
        ...(blocks?.length > 0 ? [group] : []),
        ...(siblingGroups ?? []),
        ...(groupsForEmptySelection ?? []),
      ].reduce((acc, group) => group ? acc.concat(groupMappingRef.current?.[group?.uuid]) : acc, [])
    );

    blocksRef.current = blocks;
    groupsRef.current = groups;

    if (blocks?.length > 0 || groups?.length > 0) {
      const shadowNodes = [];

      Object.entries({
        [ItemTypeEnum.BLOCK]: blocks,
        [ItemTypeEnum.NODE]: groups,
      }).forEach(([type, models]: [ItemTypeEnum, (BlockType | FrameworkType)[]]) =>
        shadowNodes.push(...models?.map((block: BlockType | FrameworkType, index: number) =>
          renderNodeData(block as any, type, index)) as any
        ));

      // Need to clear this our shouldCapture in ShadowNodeType won’t execute.
      rectsMappingRef.current = {};

      setRenderer(
        <ShadowRenderer
          handleDataCapture={({ data, id }, { rect }) => {
            updateRects({ [id]: { data, rect } });
          }}
          nodes={shadowNodes}
          uuid={getNewUUID(3, 'clock')}
          waitUntil={(nodes: ShadowNodeType[]) => nodes?.length > 0
            && nodes?.every(({ id }) => !!dragRefs.current?.[id]?.current)}
        />
      )
    }

    setModels((prev: ModelsType) => ({
      ...prev,
      blocks: blocksRef.current,
      groups: groupsRef.current,
    }) as any);
  });

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

  const headerData = useMemo(() => ({
    ...(defaultGroups ? { defaultGroups } : {}),
    executionFramework: framework,
    groupsByLevel: groupsByLevelRef.current ?? [],
    handleMenuItemClick: (_event: MouseEvent, groups: MenuGroupType[]) =>
      setSelectedGroupsRef.current(groups),
    pipeline,
  }), [defaultGroups, framework, pipeline]);

  // Models
  function updateRects(rectData: Record<string, {
    data: {
      node: {
        type: ItemTypeEnum;
      };
    };
    rect: RectType;
  }>) {
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
      const blockNodes = [];
      Object.entries(rectRefs.current ?? {}).forEach(([id, rectRef]) => {
        const rect = rectRef.current;
        const { type } = rect;

        let block = null;
        if (ItemTypeEnum.BLOCK === type) {
          block = blockMappingRef.current?.[id] ?? groupMappingRef.current?.[id];
        } else {
          block = groupMappingRef.current?.[id] ?? blockMappingRef.current?.[id];
        }

        blockNodes.push({
          block,
          node: {
            type: rect.type,
          },
          rect,
        });
      });
      const blockNodeMapping = indexBy(blockNodes, bn => bn?.block?.uuid);

      const blocks = blocksRef.current ?? [];
      const groups = groupsRef.current ?? [];

      const rects1 = hydrateBlockNodeRects(
        (blocks ?? []).concat(groups ?? []).map(m => blockNodeMapping[m.uuid]),
        blockNodeMapping,
      );

      const rectsmap = indexBy(rects1, r => r?.id);
      const rects = rects1?.map((rect) => {
        const { block } = rect;
        return {
          ...rect,
          // e.g. cleaning’s upstream is map
          // map belongs to group load.
          upstream: rect?.upstream?.reduce((acc, { id }) => {
            const upgroup = groupMappingRef.current?.[id];
            const gs = upgroup?.groups;
            const arr = [];
            gs?.forEach((guuid) => {
              if (guuid in rectsmap) {
                arr.push(rectsmap[guuid]);
              }
            });

            upgroup?.children?.filter(
              b => block?.children?.some?.(c => b?.downstream_blocks?.includes(c.uuid))
            )?.forEach(b => {
              if (b.uuid in rectsmap) {
                arr.push(rectsmap[b.uuid]);
              }
            });

            if ((arr?.length ?? 0) === 0) {
              arr.push(rectsmap[id]);
            }

            return acc.concat(arr);
          }, []),
        };
      });

      // blockNodes?.forEach(bn => {
      //   if (bn?.block?.children?.length > 0) {
      //     bn?.block?.children?.forEach(({ uuid }) => {
      //       if (!(uuid in blockNodeMapping)) {
      //         blockNodeMapping[uuid] = bn;
      //       }
      //     });
      //   }
      // });

      // console.log(`start:\n${logMessageForRects(rects)}`);
      // console.log(rects);

      const transformations = buildRectTransformations({
        layoutConfig: layoutConfigsRef.current?.[selectedGroupsRef.current?.length - 1],
        selectedGroup: selectedGroupsRef.current?.[selectedGroupsRef.current?.length - 1],
      });
      const tfs = transformRects(rects, transformations);
      console.log(`  end:\n${logMessageForRects(tfs)}`);

      rectsMappingRef.current = indexBy(tfs, r => r.id);

      if (blocks?.length > 0 || groups?.length > 0) {
        if ((blocks?.length > 0 && blocks?.every(b => b.uuid in (rectsMappingRef.current ?? {})))
          || (groups?.length > 0 && groups?.every(g => g.uuid in (rectsMappingRef.current ?? {})))
        ) {
          setRectsMapping(rectsMappingRef.current);
        }
      }
    };

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(updateState, 100);
  }

  useEffect(() => {
    if (framework === null && frameworkMutants.detail.isIdle) {
      frameworkMutants.detail.mutate();
    }
    if (pipeline === null && pipelineMutants.detail.isIdle) {
      pipelineMutants.detail.mutate();
    }
    if ((framework ?? false) && (pipeline ?? false)) {
      if ([blocksByGroupRef, blockMappingRef, groupMappingRef, groupsByLevelRef].every(
        r => !r.current
      )) {
        const { blocksByGroup, blockMapping, groupMapping, groupsByLevel } =
          buildDependencies(framework, pipeline);
        blocksByGroupRef.current = blocksByGroup;
        blockMappingRef.current = blockMapping;
        groupMappingRef.current = groupMapping;
        groupsByLevelRef.current = groupsByLevel;
      }

      // [WARNING]: The above needs to run 1st
      if (selectedGroupsRef.current === null) {
        setSelectedGroupsRef.current(getCache([framework.uuid, pipeline.uuid].join(':')));
      }
    }
  }, [framework, frameworkMutants, pipeline, pipelineMutants]);

  const blocks = useMemo(() => models?.blocks ?? [], [models?.blocks]);
  const groups = useMemo(() => models?.groups ?? [], [models?.groups]);

  const nodesMemo = useMemo(() => {
    const arr = [];

    Object.entries({
      [ItemTypeEnum.BLOCK]: blocks,
      [ItemTypeEnum.NODE]: groups,
    }).forEach(([nodeType, blocks]: [ItemTypeEnum, (BlockType | FrameworkType)[]]) => {
      blocks?.forEach((block: BlockType | FrameworkType) => {
        const index = arr.length;
        let dragRef = dragRefs.current[block.uuid];
        if (!dragRef) {
          dragRef = createRef();
          dragRefs.current[block.uuid] = dragRef;
        }

        arr.push(
          <DragWrapper
            // draggable={draggable}
            // droppable={droppable}
            // droppableItemTypes={droppableItemTypes}
            // eventHandlers={eventHandlers}
            // handleDrop={handleDrop}
            item={{
              block,
              id: block.uuid,
              type: nodeType,
            } as NodeType}
            key={block.uuid}
            rect={rectsMapping?.[block.uuid] ?? {
              left: undefined,
              top: undefined,
            }}
            ref={dragRef}
          />
        );
      });
    });

    return arr;
  }, [blocks, groups, rectsMapping]);

  const selectedGroupRect = useMemo(() => {
    const selectedGroup = selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1];
    const currentGroupChildrenIDs = selectedGroup?.items?.map(item => item.uuid);
    const rectsInGroup = currentGroupChildrenIDs?.map(id => rectsMapping?.[id]) ?? [];
    const groupBlock = groupMappingRef?.current?.[selectedGroup?.uuid];
    const groupRect = {
      ...calculateBoundingBox(rectsInGroup),
      block: groupBlock,
      id: groupBlock?.uuid,
      type: ItemTypeEnum.NODE,
      upstream: unique(
        rectsInGroup?.flatMap(r => r.upstream ?? []),
        r => r.id
      )?.filter(up => !currentGroupChildrenIDs?.includes(up.id)),
    };
    groupRect.left -= GROUP_NODE_PADDING;
    groupRect.top -= GROUP_NODE_PADDING;
    groupRect.width += GROUP_NODE_PADDING * 2;
    groupRect.height += GROUP_NODE_PADDING * 2;

    return groupRect;
  }, [rectsMapping]);

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
            layoutConfigsRef={layoutConfigsRef}
            selectedGroupsRef={selectedGroupsRef}
          >
            <ModelProvider
              blockMappingRef={blockMappingRef}
              blocksByGroupRef={blocksByGroupRef}
              groupMappingRef={groupMappingRef}
              groupsByLevelRef={groupsByLevelRef}
            >
              {nodesMemo}
              {renderer}

              <LineManagerV2 rectsMapping={rectsMapping} selectedGroupRect={selectedGroupRect} />
            </ModelProvider>
          </SettingsProvider>
        </CanvasContainer>
      </div>

      {framework && pipeline && <HeaderUpdater {...headerData as any} />}
    </div>
  );
}

export default PipelineCanvasV2;
