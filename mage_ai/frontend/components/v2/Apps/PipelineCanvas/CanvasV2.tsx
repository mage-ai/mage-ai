import BlockNodeV2, { BADGE_HEIGHT, PADDING_VERTICAL } from '../../Canvas/Nodes/BlockNodeV2';
import stylesPipelineBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { motion, animate, useAnimation, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import { applyRectDiff, calculateBoundingBox, getRectDiff, GROUP_NODE_PADDING } from '../../Canvas/utils/layout/shared';
import { transformRects } from '../../Canvas/utils/rect';
import {
  ItemTypeEnum, LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum, LayoutDisplayEnum, LayoutStyleEnum,
} from '../../Canvas/types';
import BlockType from '@interfaces/BlockType';
import CanvasContainer, { GRID_SIZE } from './index.style';
import LineManagerV2, { ANIMATION_DURATION as ANIMATION_DURATION_LINES, EASING } from './Lines/LineManagerV2';
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
import { deepCopyArray, equals, indexBy, unique, uniqueArray } from '@utils/array';
import { getNewUUID } from '@utils/string';
import { deepCopy, isEmptyObject } from '@utils/hash';
import { WithOnMount } from '@mana/hooks/useWithOnMount';

const ENTER_ANIMATION_START_THRESHOLD = 0.6;
const ANIMATION_DURATION = 1;
const INITIAL_ANIMATION_DURATION = 0.2;

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
  const readyToEnterRef = useRef<Record<string, boolean>>({});

  const [isAnimating, setIsAnimating] = useState(true);
  const animationTimeoutRef = useRef(null);
  const animationProgress = useMotionValue(0);
  const animationInitialProgress = useMotionValue(0);
  const phaseRef = useRef(0);
  const controlsForLines = useAnimation();

  const scaleExit = useTransform(() => {
    const val = animationProgress.get();
    return 1 + val;
  });
  const opacityExit = useTransform(() => {
    const val = animationProgress.get();
    return 1 - val;
  });

  const opacityInit = useTransform(() => animationInitialProgress.get());
  const scaleInit = useTransform(() => 0.8 + (0.2 * animationInitialProgress.get()));
  const translateXInit = useTransform(() => 0 * GROUP_NODE_PADDING * (1 - animationInitialProgress.get()));
  const translateYInit = useTransform(() => 0 * GROUP_NODE_PADDING * (1 - animationInitialProgress.get()));

  const opacityEnter = useTransform(() => {
    const val = animationProgress.get();
    const factor = val < ENTER_ANIMATION_START_THRESHOLD ? 0 : 2.5;
    return (val - ENTER_ANIMATION_START_THRESHOLD) * factor;
  });
  const scaleEnter = useTransform(() => {
    const val = animationProgress.get();
    const factor = val < ENTER_ANIMATION_START_THRESHOLD ? 0 : 1;
    return (scaleExit.get() / 2) * factor;
  });

  const exitOriginX = useRef(0);
  const exitOriginY = useRef(0);

  const translateXEnter = useMotionValue(0);
  const translateYEnter = useMotionValue(0);

  const scopeEnter = useRef(null);
  const scopeExit = useRef(null);

  // Settings
  const [headerData, setHeaderData] = useState<any>(null);
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
  // This is the one that gets updates; rectRefs keeps a running list of all rects.
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
    // console.log(`[Canvas:${type}] renderNodeData:`, block.uuid);

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
      waitUntil: (node: ShadowNodeType) => dragRefs.current?.[node.id]?.current !== null,
    };
  }

  function handleLineTransitions() {
    controlsForLines.start(({
      index,
      isOutput,
    }) => ({
      ease: EASING,
      opacity: 1,
      pathLength: 1,
      transition: {
        delay: (index * ANIMATION_DURATION_LINES) + (isOutput ? 1 : 0.5),
        duration: isOutput ? 0.1 : ANIMATION_DURATION_LINES * ((100 - index) / 100),
      },
    }));
  }

  function resetLineTransitions() {
    controlsForLines.set({ opacity: 0, pathLength: 0 });
  }

  function handleInitialTransition(
    currentGroupUUID: string,
    rectsMap: Record<string, RectType>,
    groupsPrev: MenuGroupType[],
    groupsNext: MenuGroupType[],
  ) {
    const nextGroupRectCur = rectsMap?.[currentGroupUUID];
    const xorigin = (nextGroupRectCur?.left ?? 0);
    const yorigin = (nextGroupRectCur?.top ?? 0);
    exitOriginX.current = xorigin;
    exitOriginY.current = yorigin;
    scopeEnter.current.style.transformOrigin = `${xorigin}px ${yorigin}px`;

    resetLineTransitions();

    animationInitialProgress.set(0);
    animate(animationInitialProgress, 1, {
      delay: 1,
      duration: INITIAL_ANIMATION_DURATION,
      onUpdate: (latest) => {
        if (latest >= 1) {
          scopeEnter.current.style.opacity = '';
          scopeEnter.current.style.transform = '';
          scopeEnter.current.style.transformOrigin = '';

          animationTimeoutRef.current = setTimeout(() => {
            setIsAnimating(false);
          }, INITIAL_ANIMATION_DURATION);

          handleLineTransitions();
        }
      },
    });
  }

  function handleTransitions(
    currentGroupUUID: string,
    rectsMap: Record<string, RectType>,
    groupsPrev: MenuGroupType[],
    groupsNext: MenuGroupType[],
  ) {
    const prevCount = groupsPrev?.length ?? 0;
    const nextCount = groupsNext?.length ?? 0;

    const nextGroupRectCur = rectsMap?.[currentGroupUUID];

    if (prevCount === nextCount) {
      // Going into a sibling: switching (sibling teleport blocks)
      // Animate sliding the current view left or right and opacity

      // If the sibling teleport block is on the right of the current group:
      // Exit: slide left, opacity
      // Enter: slide right, opacity

      // If the sibling teleport block is on the left of the current group:
      // Exit: slide right, opacity
      // Enter: slide left, opacity
    } else if (prevCount > nextCount) {
      // Going up to the parent: leaving (opposite of entering a child group)

      // Exit: Animate zooming out and opacity

      // Enter: Animate the next set of nodes by scaling down but use the new selected group
      // as the origin.
    } else if (nextCount > prevCount) {
      // Going into a child: entering (opposite of leaving a child group)

      // Exit:Animate zooming in and opacity
      // If rect doesn’t exist in the canvas, then zoom in on the center origin.


      // Enter: scale up the next set, opacity, use the new group as the origin.
    }

    readyToEnterRef.current = {};

    const clone = scopeEnter.current.firstChild.cloneNode(true)
    scopeExit.current.appendChild(clone);

    scopeEnter.current.style.transformOrigin = '0px 0px';

    const xorigin = (nextGroupRectCur?.left ?? 0);
    const yorigin = (nextGroupRectCur?.top ?? 0);
    exitOriginX.current = xorigin;
    exitOriginY.current = yorigin;
    scopeExit.current.style.transformOrigin = `${xorigin}px ${yorigin}px`;

    wrapperRef.current.classList.add(stylesPipelineBuilder.waiting);

    scopeEnter.current.classList.add(stylesPipelineBuilder.entering);

    scopeExit.current.classList.add(stylesPipelineBuilder.exiting);
    scopeExit.current.classList.remove(stylesPipelineBuilder.idle);

    console.log(
      `[transition] start: ${currentGroupUUID}`,
      scopeExit.current.style.transformOrigin,
    );

    resetLineTransitions();
    setIsAnimating(true);

    animationProgress.set(0);
    animate(animationProgress, 1, {
      duration: ANIMATION_DURATION,
      onUpdate: (latest) => {
        if (latest >= 1) {
          clone.remove();

          scopeEnter.current.classList.remove(stylesPipelineBuilder.entering);
          scopeEnter.current.style.opacity = '';
          scopeEnter.current.style.transform = '';
          scopeEnter.current.style.transformOrigin = '';

          scopeExit.current.classList.add(stylesPipelineBuilder.idle);
          scopeExit.current.classList.remove(stylesPipelineBuilder.exiting);

          wrapperRef.current.classList.remove(stylesPipelineBuilder.waiting);

          animationTimeoutRef.current = setTimeout(() => {
            setIsAnimating(false);
          }, ANIMATION_DURATION);

          handleLineTransitions();
        }
      },
    });
  }

  const setSelectedGroupsRef = useRef((groupsArg: MenuGroupType[]) => {
    const prevGroups = deepCopyArray(selectedGroupsRef.current ?? []);
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

    if (phaseRef.current === 0) {
      handleInitialTransition(
        currentGroup?.uuid,
        rectsMappingRef.current,
        prevGroups,
        selectedGroupsRef.current,
      );
    } else {
      handleTransitions(
        currentGroup?.uuid,
        rectsMappingRef.current,
        prevGroups,
        selectedGroupsRef.current,
      );
      readyToEnterRef.current = {};
      (blocks ?? []).concat(groups ?? [])?.forEach(b => {
        readyToEnterRef.current[b.uuid] = false;
      });
    }

    // Need to clear this our shouldCapture in ShadowNodeType won’t execute.
    rectsMappingRef.current = {};

    if (blocks?.length > 0 || groups?.length > 0) {
      const shadowNodes = [];

      Object.entries({
        [ItemTypeEnum.BLOCK]: blocks,
        [ItemTypeEnum.NODE]: groups,
      }).forEach(([type, models]: [ItemTypeEnum, (BlockType | FrameworkType)[]]) =>
        shadowNodes.push(...models?.map((block: BlockType | FrameworkType, index: number) =>
          renderNodeData(block as any, type, index)) as any
        ));

      setRenderer(
        <ShadowRenderer
          handleDataCapture={({ data, id }, { rect }) => {
            updateRects({ [id]: { data, rect } });
          }}
          handleNodeTransfer={(node: ShadowNodeType) => {
            readyToEnterRef.current[node.id] = true;
          }}
          nodes={shadowNodes}
          uuid={getNewUUID(3, 'clock')}
        />
      )
    }

    setModels((prev: ModelsType) => ({
      ...prev,
      blocks: blocksRef.current,
      groups: groupsRef.current,
    }) as any);

    phaseRef.current += 1;
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
            buildRectTransformations({
              disableAlignments: true, layoutConfig: layoutConfig?.childrenLayout, selectedGroup,
            });

          // console.log(`| start[children]:\n${logMessageForRects(rectsInGroup)}`);
          // console.log(rectsInGroup);
          const tfs = transformRects(rectsInGroup, transformations);
          // console.log(`| end[children]:\n${logMessageForRects(tfs)}`);

          const map = indexBy(tfs ?? [], r => r.id) ?? {};
          groupRect = buildSelectedGroupRect(group?.uuid, map);
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

      // console.log(`start:\n${logMessageForRects(rectsUse)}`);
      // console.log(rectsUse);

      // console.log(
      //   '!!!!!!!!!!!!!!!!!!!!!',
      //   groupRect,
      //   group,
      // );

      const centerRect = groupRect ?? rectsUse?.find(r => r?.block?.uuid === group?.uuid);

      const transformations = buildRectTransformations({
        centerRect,
        layoutConfig,
        selectedGroup,
      });
      let tfs = transformRects(rectsUse, transformations);
      // console.log(`end:\n${logMessageForRects(tfs)}`);

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

  useEffect(() => {
    if ((framework ?? false) && (pipeline ?? false)) {
      setHeaderData({
        ...(defaultGroups ? { defaultGroups } : {}),
        executionFramework: framework,
        groupsByLevel: groupsByLevelRef.current ?? [],
        handleMenuItemClick: (_event: MouseEvent, groups: MenuGroupType[]) =>
          setSelectedGroupsRef.current(groups),
        pipeline,
      });
    }
  }, [defaultGroups, framework, pipeline]);

  // Cleanup
  useEffect(() => {
    const animationTimeout = animationTimeoutRef.current;
    const timeout = timeoutRef.current;

    return () => {
      clearTimeout(animationTimeout);
      clearTimeout(timeout);
      animationTimeoutRef.current = null;
      timeoutRef.current = null;
    };
  }, []);

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

  function getSelectedGroupRects(
    uuid: string,
    rects?: Record<string, RectType>,
  ): RectType[] {
    const group = groupMappingRef?.current?.[uuid];
    const childrenInGroup = indexBy(group?.children ?? [], c => c.uuid);
    const blocksInGroup = blocksByGroupRef?.current?.[uuid] ?? {};
    return Object.values(
      rects ?? rectsMappingRef?.current ?? {}
    )?.filter(r => blocksInGroup?.[r.id] || childrenInGroup?.[r.id]);
  }

  const buildSelectedGroupRect = useCallback((uuid: string, rects?: Record<string, RectType>) => {
    const group = groupMappingRef?.current?.[uuid];
    const childrenInGroup = indexBy(group?.children ?? [], c => c.uuid);
    const blocksInGroup = blocksByGroupRef?.current?.[uuid] ?? {};
    const rectsInGroup = getSelectedGroupRects(uuid, rects);

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
  }, []);

  const selectedGroupRect = useMemo(() => {
    if (!shouldRenderSelectedGroupSelection()) return;

    const selectedGroup = selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1];
    const group = groupMappingRef?.current?.[selectedGroup?.uuid];
    const rect = buildSelectedGroupRect(group?.uuid, rectsMapping);

    return {
      ...rect,
      ...(rectsMappingRef?.current?.[group?.id] ?? {}),
    };
  }, [buildSelectedGroupRect, rectsMapping]);

  const selectedGroupNode = useMemo(() => {
    if ((selectedGroupRect?.items ?? 0) === 0 || !selectedGroupRect?.block) return;

    const { block, type } = selectedGroupRect ?? {};
    const node = {
      block: block,
      id: block?.uuid,
      type,
    } as NodeType;

    let dragRef = dragRefs.current[block.uuid];
    if (!dragRef) {
      dragRef = createRef();
      dragRefs.current[block.uuid] = dragRef;
    }

    let nodeRef = nodeRefs.current[block.uuid];
    if (!nodeRef) {
      nodeRef = createRef();
      nodeRefs.current[block.uuid] = nodeRef;
    }

    return (
      <WithOnMount
        key={block?.uuid}
        onMount={() => {
          readyToEnterRef.current[block.uuid] = true
        }}
      >
        <DragWrapper
          // draggable={draggable}
          // droppable={droppable}
          // droppableItemTypes={droppableItemTypes}
          // eventHandlers={eventHandlers}
          // handleDrop={handleDrop}
          groupSelection
          item={node}
          rect={selectedGroupRect ?? {
            left: undefined,
            top: undefined,
          }}
          ref={dragRef}
        >
          <BlockNodeV2
            block={block}
            groupSelection
            key={block.uuid}
            node={node as NodeType}
            ref={nodeRef}
          />
        </DragWrapper>
      </WithOnMount>
    );
  }, [selectedGroupRect]);

  function handleMotionValueChange(latest: number, initial?: boolean) {
    const uuid = selectedGroupsRef.current?.[selectedGroupsRef.current?.length - 1]?.uuid;
    const rect1 = rectsMapping?.[uuid];
    const rect2 = rectsMappingRef?.current?.[uuid]

    const rectpri = [selectedGroupRect, rect1, rect2];
    const rectuse =
      rectpri.find(r => ['height', 'left', 'top', 'width'].every(k => (r?.[k] ?? false) !== false));

    let x = null;
    let y = null;
    if (rectuse) {
      const { height, left, top, width } = rectuse;

      // transform origin for scaling
      // x = left - (width / 2);
      // y = top - (height / 2);

      if (!initial) {
        const factor = latest < ENTER_ANIMATION_START_THRESHOLD ? 0 : 1;
        const val = (scaleExit.get() / 2) * factor;

        // transform for translating
        x = (exitOriginX.current ?? 0) - left;
        y = (exitOriginY.current ?? 0) - top;
        translateXEnter.set(x * (1 - val));
        translateYEnter.set(y * (1 - val));
      }

      scopeEnter.current.style.transformOrigin = `${left ?? 0}px ${top ?? 0}px`;
    }

    console.log(`[transition] entering: ${uuid}:`, scopeEnter.current.style.transformOrigin);

    const itemIDs = selectedGroupRect?.items?.map(i => i.id) ?? [];
    const countToMatch =
      uniqueArray(Object.keys(readyToEnterRef.current ?? {}).concat(itemIDs))?.length;
    const count1 = uniqueArray(Object.keys(rectsMappingRef.current).concat(itemIDs))?.length;
    const count2 = uniqueArray(Object.keys(rectsMapping ?? {}).concat(itemIDs))?.length;

    console.log(
      'readyToEnter', countToMatch,
      'rectsMappingRef', count1,
      'rectsMapping', count2,
    );

    if ((x ?? false) && (y ?? false) && count1 >= countToMatch) {
      wrapperRef.current.classList.remove(stylesPipelineBuilder.waiting);
    }
  }

  useMotionValueEvent(animationInitialProgress, 'change', latest => handleMotionValueChange(latest, true));
  useMotionValueEvent(animationProgress, 'change', handleMotionValueChange);

  return (
    <div
      className={stylesPipelineBuilder.wrapper}
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
              <motion.div
                className={[
                  stylesPipelineBuilder.planesWrapper,
                  stylesPipelineBuilder.enter,
                ].join(' ')}
                ref={scopeEnter}
                style={phaseRef.current < 2
                  ? {
                    opacity: opacityInit,
                    scale: scaleInit,
                    translateX: translateXInit,
                    translateY: translateYInit,
                  }
                  : isAnimating
                    ? {
                      opacity: opacityEnter,
                      scale: scaleEnter,
                      translateX: translateXEnter,
                      translateY: translateYEnter,
                    }
                    : {}
                }
              >
                <div>
                  {nodesMemo}
                  {selectedGroupNode}

                  <LineManagerV2
                    controls={controlsForLines}
                    rectsMapping={rectsMapping}
                    selectedGroupRect={selectedGroupRect}
                  />
                </div>
              </motion.div>

              <motion.div
                className={[
                  stylesPipelineBuilder.planesWrapper,
                  stylesPipelineBuilder.idle,
                  stylesPipelineBuilder.exit,
                ].join(' ')}
                ref={scopeExit}
                style={{
                  opacity: opacityExit,
                  scale: scaleExit,
                }}
              />

              {renderer}
            </ModelProvider>
          </SettingsProvider>
        </CanvasContainer>
      </div>

      {headerData && <HeaderUpdater {...headerData as any} />}
    </div >
  );
}

export default PipelineCanvasV2;
