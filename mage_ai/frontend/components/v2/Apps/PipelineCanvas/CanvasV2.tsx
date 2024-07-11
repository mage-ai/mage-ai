import BlockNodeV2, { BADGE_HEIGHT, PADDING_VERTICAL } from '../../Canvas/Nodes/BlockNodeV2';
import { applyRectDiff, calculateBoundingBox, getRectDiff, logMessageForRects } from '../../Canvas/utils/layout/shared';
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
import { isEmptyObject } from '@utils/hash';

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
      childrenLayout: defaultLayoutConfig({
        direction: LayoutConfigDirectionEnum.HORIZONTAL,
        display: LayoutDisplayEnum.SIMPLE,
        style: LayoutStyleEnum.WAVE,
      }),
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
      display: LayoutDisplayEnum.SIMPLE,
      style: LayoutStyleEnum.WAVE,
    }),
    defaultLayoutConfig({
      childrenLayout: defaultLayoutConfig({
        direction: LayoutConfigDirectionEnum.HORIZONTAL,
        display: LayoutDisplayEnum.SIMPLE,
        style: LayoutStyleEnum.GRID,
      }),
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
      display: LayoutDisplayEnum.SIMPLE,
      style: LayoutStyleEnum.WAVE,
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
        const valid = !rectsMappingRef.current?.[block.uuid];
        // console.log('shouldCapture', block.uuid, valid);
        return valid;
      },
      targetRef: (node: ShadowNodeType) => dragRefs.current[node.id],
    };
  }

  const setSelectedGroupsRef = useRef((groupsArg: MenuGroupType[]) => {
    selectedGroupsRef.current = groupsArg;

    const currentGroup = groupsArg?.[groupsArg?.length - 1];
    const groupModel = groupMappingRef.current?.[currentGroup?.uuid];
    const parentGroup = groupsArg?.[groupsArg?.length - 2];
    const siblingGroups = groupMappingRef.current?.[parentGroup?.uuid]?.children?.filter(
      g => g.uuid !== currentGroup?.uuid);

    const blocks =
      (Object.values(blocksByGroupRef.current?.[currentGroup?.uuid] ?? {}) ?? []) as BlockType[];

    const groupsForEmptySelection = [];
    if ((groupsArg?.length ?? 0) === 0 && !currentGroup) {
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

    const groups = (groupModel?.children ?? []).concat(
      [
        // Should we show the parent group as well?
        // parentGroup,
        // Add the current group so we can show groupings within it. This is handled manually.
        // ------------------------------------------------------------------------------------------
        ...(shouldRenderSelectedGroupSelection() ? [] : [groupModel]),
        ...(siblingGroups ?? []),
        ...(groupsForEmptySelection ?? []),
      ].reduce((acc, group2) => group2 ? acc.concat(
        groupMappingRef.current?.[group2?.uuid]
      ) : acc, [])
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
  function shouldRenderSelectedGroupSelection(): boolean {
    const selectedGroup = selectedGroupsRef.current?.[selectedGroupsRef.current?.length - 1];
    const group = groupMappingRef.current?.[selectedGroup?.uuid];
    const blocksInGroup = blocksByGroupRef?.current?.[selectedGroup?.uuid] ?? {};
    const isValidGroup = group
      && ((group?.children?.length ?? 0) > 0 || !isEmptyObject(blocksInGroup ?? {}));
    return !!isValidGroup;
  }
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
      const blocks = [];
      blocksRef?.current?.forEach(g => {
        blocks.push({ ...g });
      });
      const groups = [];
      groupsRef?.current?.forEach(g => {
        groups.push({ ...g });
      });

      const layoutConfig = layoutConfigsRef.current?.[selectedGroupsRef.current?.length - 1];
      const selectedGroup = selectedGroupsRef.current?.[selectedGroupsRef.current?.length - 1];
      const group = groupMappingRef.current?.[selectedGroup?.uuid];
      const blocksInGroup = blocksByGroupRef?.current?.[selectedGroup?.uuid] ?? {};
      const isValidGroup = shouldRenderSelectedGroupSelection();

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

      if (isValidGroup) {
        blockNodes.push({
          block: { ...group },
          node: {
            type: ItemTypeEnum.NODE,
          },
          rect: {
            height: 0,
            left: 0,
            top: 0,
            type: ItemTypeEnum.NODE,
            width: 0,
          },
        });
      }

      const blockNodeMapping = indexBy(blockNodes, bn => bn?.block?.uuid);
      const rects1 = hydrateBlockNodeRects(
        (blocks ?? []).concat(groups ?? [])
          .concat(isValidGroup ? [{ ...group }] : [])
          .map(m => blockNodeMapping[m.uuid]),
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
            const block2 = blockMappingRef.current?.[id];


            // Don’t add the parent as the upstream
            gs?.forEach((guuid) => {
              if (!block?.groups?.includes(guuid) && rectsmap?.[guuid]) {
                arr.push(rectsmap[guuid]);
              }
            });

            // If current block is a block in the current group and the upstream is a block
            // in the same group
            if (blocksInGroup?.[block?.uuid] && blocksInGroup?.[block2?.uuid]) {
              if (rectsmap?.[block2.uuid]) {
                arr.push(rectsmap[block2.uuid]);
              }
            } else if (
              // If upstream is the currently selected block or...
              group?.uuid === id
              // If the upstream is a sibling of the
              // currently selected block, then add it to the upstream.
              || upgroup?.groups?.some?.(guuid => block?.groups?.includes(guuid))
            ) {
              arr.push(rectsmap[id]);
            } else {
              // Look into the group of a sibling to check for the upstream blocks that have no
              // downstream block.
              upgroup?.children?.filter(
                b => block?.children?.some?.(c => b?.downstream_blocks?.includes(c.uuid))
              )?.forEach(b => {
                if (rectsmap?.[b.uuid]) {
                  arr.push(rectsmap[b.uuid]);
                }
              });
            }

            console.log('OMGGGGGGGGGGGGGGGGGGGGGGGGG', block.uuid, block2?.uuid, id, blocksInGroup, rectsmap, arr)

            return acc.concat(arr);
          }, []),
        };
      });



      let rectsUse = rects;
      let groupRect = null;
      if (isValidGroup && layoutConfig?.childrenLayout) {
        const childrenInGroup = indexBy(group?.children ?? [], c => c.uuid);
        const rectsInGroup = rects?.filter(r => blocksInGroup?.[r.id] || childrenInGroup?.[r.id]);

        if (rectsInGroup?.length > 0) {
          const transformations =
            buildRectTransformations({ layoutConfig: layoutConfig?.childrenLayout, selectedGroup });

          console.log(`| start[children]:\n${logMessageForRects(rectsInGroup)}`);
          console.log(rectsInGroup);
          const tfs = transformRects(rectsInGroup, transformations);
          console.log(`| end[children]:\n${logMessageForRects(tfs)}`);

          const map = indexBy(tfs ?? [], r => r.id) ?? {};
          groupRect = buildSelectedGroupRect(group, map);
          rectsUse = rectsUse?.filter(r => !map?.[r.id] && r.id !== groupRect.id).concat({
            ...rectsmap?.[groupRect.id],
            ...groupRect,
            items: [],
          });
        }
      }

      if ((rectsUse?.length ?? 0) === 0) {
        rectsUse = rects;
      }

      console.log(`start:\n${logMessageForRects(rectsUse)}`);
      console.log(rectsUse);

      const transformations = buildRectTransformations({ layoutConfig, selectedGroup });
      let tfs = transformRects(rectsUse, transformations);
      console.log(`end:\n${logMessageForRects(tfs)}`);

      if (groupRect) {
        const grouptf = tfs.find(r => r.id === groupRect.id);
        const diff = getRectDiff(groupRect, grouptf);
        const items = groupRect?.items?.map(r => applyRectDiff(r, diff));
        tfs = tfs.concat(...(items ?? [])).filter(r => r.id !== groupRect.id);
      }
      rectsMappingRef.current = indexBy(tfs, r => r.id);

      if (blocks?.length > 0 || groups?.length > 0) {
        if ((blocks?.length > 0 && blocks?.every(b => (rectsMappingRef.current ?? {})?.[b.uuid]))
          || (groups?.length > 0 && groups?.every(g => (rectsMappingRef.current ?? {})?.[g.uuid]))
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

  function buildSelectedGroupRect(selectedGroup: FrameworkType, rects: Record<string, RectType>) {
    const group = groupMappingRef?.current?.[selectedGroup.uuid];
    const childrenInGroup = indexBy(group?.children ?? [], c => c.uuid);
    const blocksInGroup = blocksByGroupRef?.current?.[selectedGroup?.uuid] ?? {};
    const rectsInGroup =
      Object.values(rects ?? {})?.filter(r => blocksInGroup?.[r.id] || childrenInGroup?.[r.id]);

    const upstreams = [];
    group?.upstream_blocks?.forEach(up => {
      upstreams.push({
        ...(rects?.[up] ?? {}),
        id: up,
      });
    });

    rectsInGroup?.forEach(r => {
      (r.upstream ?? [])?.forEach(rup => {
        // Don’t add its own children as an upstream.
        if (!childrenInGroup?.[rup.id]) {
          upstreams.push(rup);
        }
      });
    });

    const groupRect = {
      ...calculateBoundingBox(rectsInGroup),
      block: group,
      id: group?.uuid,
      items: rectsInGroup,
      type: ItemTypeEnum.NODE,
      upstream: unique(
        upstreams ?? [],
        r => r.id
      )?.filter(up => !blocksInGroup?.[up.id]),
    };

    const yoff = BADGE_HEIGHT + PADDING_VERTICAL;
    groupRect.left -= GROUP_NODE_PADDING;
    groupRect.top -= GROUP_NODE_PADDING + yoff;
    groupRect.width += GROUP_NODE_PADDING * 2;
    groupRect.height += (GROUP_NODE_PADDING * 2) + yoff;

    return groupRect;
  }

  const selectedGroupRect = useMemo(() => {
    if (!shouldRenderSelectedGroupSelection()) return;

    const selectedGroup = selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1];
    const group = groupMappingRef?.current?.[selectedGroup?.uuid];
    const rect = buildSelectedGroupRect(group, rectsMapping);

    return {
      ...rect,
      ...(rectsMappingRef?.current?.[group?.id] ?? {}),
    };
  }, [rectsMapping]);

  const selectedGroupNode = useMemo(() => {
    if ((selectedGroupRect?.items ?? 0) === 0 || !selectedGroupRect?.block) return;

    const { block, type } = selectedGroupRect ?? {};
    const node = {
      block: block,
      id: block?.uuid,
      type,
    } as NodeType;

    return (
      <DragWrapper
        // draggable={draggable}
        // droppable={droppable}
        // droppableItemTypes={droppableItemTypes}
        // eventHandlers={eventHandlers}
        // handleDrop={handleDrop}
        groupSelection
        item={node}
        key={block?.uuid}
        rect={selectedGroupRect ?? {
          left: undefined,
          top: undefined,
        }}
      // ref={dragRef}
      >
        <BlockNodeV2
          block={block}
          key={block.uuid}
          node={node as NodeType}
          groupSelection
        // ref={nodeRef}
        />
      </DragWrapper>
    );
  }, [selectedGroupRect])

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

              {selectedGroupNode}

              <LineManagerV2
                rectsMapping={rectsMapping}
                selectedGroupRect={selectedGroupRect}
              />
            </ModelProvider>
          </SettingsProvider>
        </CanvasContainer>
      </div>

      {framework && pipeline && <HeaderUpdater {...headerData as any} />}
    </div>
  );
}

export default PipelineCanvasV2;
