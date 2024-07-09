import React, { useRef, useEffect } from 'react';
import { useAnimation } from 'framer-motion';
import { update } from './cache';
import stylesOutput from '@styles/scss/components/Canvas/Nodes/OutputGroups.module.scss';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { LayoutConfigType, NodeItemType } from '../../Canvas/interfaces';
import BlockType from '@interfaces/BlockType';
import { LINE_CLASS_NAME, buildContainerClassName, displayable, extractContainerClassNames } from './utils/display';
import { levelClassName, groupClassName, nodeTypeClassName, statusClassName, uuidClassName } from '../../Canvas/Nodes/utils';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { STYLE_ROOT_ID } from '@context/v2/Style';
import { getCache } from '@mana/components/Menu/storage';
import { LayoutConfigRef, ModelManagerType, SettingsManagerType, SubscriberType } from './interfaces';
import {
  ItemTypeEnum, ItemStatusEnum, ITEM_TYPES,
  LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum,
  LayoutDisplayEnum,
  LayoutStyleEnum,
} from '../../Canvas/types';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { Root, createRoot } from 'react-dom/client';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { DEBUG } from '@components/v2/utils/debug';
import { isEmptyObject } from '@utils/hash';

// 1. ModelManager: initialize models -> UPDATE_DISPLAY -> SettingsManager
// 2. SettingsManager: filters the items that should be mounted -> NODE_LAYOUTS_CHANGED -> Canvas
// 3. Canvas mounts the exact items that should be displayed
// 4. ItemManager: each node is mounted and then ItemManager triggers -> UPDATE_DISPLAY
// 5. SettingsManager: collects the updated items and triggers -> UPDATE_NODE_LAYOUTS
// 6. LayoutManager lays out the items and applies transformations, then -> NODE_RECT_UPDATED
// 7. Each node handles their updated rects and enter animations, once done -> NODE_DISPLAYED
// 8. LineManager: draws the lines for each node that dispatches that event.

// Changing groups:
// 1. NavigationGroupMenu: triggers -> UPDATE_SETTINGS
// 2. SettingsManager: updates layout settings to store the selected group and active level,
//   then filters the items that should be mounted -> NODE_LAYOUTS_CHANGED -> Canvas
// 3. Repeat from step 3 above...

export default function useSettingsManager({
  blocksByGroupRef,
  canvasRef,
  containerRef,
  executionFrameworkUUID,
  itemsRef,
  pipelineUUID,
}: {
  blocksByGroupRef: ModelManagerType['blocksByGroupRef'];
  canvasRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  executionFrameworkUUID: string;
  itemsRef: ModelManagerType['itemsRef'];
  pipelineUUID: string;
  setHeaderData?: (data: any) => void;
}): SettingsManagerType {
  const controls = useAnimation();

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

  const styleRootRef = useRef<HTMLStyleElement>(null);

  const groups = getCache([executionFrameworkUUID, pipelineUUID].join(':'));
  const selectedGroupsRef = useRef<MenuGroupType[]>(groups);
  const activeLevel = useRef<number>(selectedGroupsRef?.current?.length ?? 0);

  const validLevels = useRef<number[]>(null);
  const layoutConfigs = useRef<LayoutConfigRef[]>([
    useRef<LayoutConfigType>(defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.VERTICAL,
    })),
    useRef<LayoutConfigType>(defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.VERTICAL,
    })),
    useRef<LayoutConfigType>(defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
      display: LayoutDisplayEnum.SIMPLE,
      style: LayoutStyleEnum.WAVE,
    })),
    useRef<LayoutConfigType>(defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
      display: LayoutDisplayEnum.DETAILED,
      style: LayoutStyleEnum.WAVE,
    })),
  ]);

  const {
    convertEvent,
    dispatchAppEvent,
  } = useAppEventsHandler({
    activeLevel,
    layoutConfigs,
    selectedGroupsRef,
  } as SubscriberType, {
    // [CustomAppEventEnum.NODE_LAYOUTS_CHANGED]: handleLayoutUpdates,
    [CustomAppEventEnum.TELEPORT_INTO_BLOCK]: teleportIntoBlock,
    [CustomAppEventEnum.UPDATE_DISPLAY]: filterNodesToBeMounted,
    [CustomAppEventEnum.NODE_MOUNTED_PREVIOUSLY]: handleNodeMountedPreviously,
    [CustomAppEventEnum.UPDATE_SETTINGS]: updateLocalSettings,
    [CustomAppEventEnum.UPDATE_CACHE_ITEMS]: updateCache,
  });

  // TODO: fix local settings
  // const settings = get(builderLocalStorageKey(pipelineUUID));

  // if (settings?.activeLevel !== null) {
  //   activeLevel.current = settings?.activeLevel;
  // }
  // if (settings?.optionalGroupsVisible !== null) {
  //   optionalGroupsVisible.current = settings?.optionalGroupsVisible;
  // }
  // layoutConfig.current ||= {};

  // layoutConfig.current.containerRef = containerRef;
  // layoutConfig.current.display = LayoutDisplayEnum.SIMPLE;
  // layoutConfig.current.direction = settings?.layoutConfig?.direction ?? LayoutConfigDirectionEnum.HORIZONTAL;
  // layoutConfig.current.gap = { column: 40, row: 40 };
  // layoutConfig.current.origin = LayoutConfigDirectionOriginEnum.LEFT;
  // layoutConfig.current.rectTransformations = settings?.layoutConfig?.rectTransformations ?? null;
  // layoutConfig.current.transformStateRef = transformState;
  // layoutConfig.current.viewportRef = canvasRef;

  function updateCache({ detail }: CustomAppEvent) {
    update(pipelineUUID, {
      items: detail?.nodes?.reduce((acc, { id, rect, status, version }) => ({
        ...acc,
        [id]: {
          rect: {
            ...rect,
          },
          status,
          version,
        },
      }), {}),
    });
  }

  function updateLocalSettings(event: CustomAppEvent) {
    const currentConditions = buildDisplayableConditions();

    const { options } = event?.detail ?? {};
    const kwargs = options?.kwargs ?? {};

    DEBUG.settings.manager && console.log('updateLocalSettings', event)

    let level = null
    if ('groups' in kwargs) {
      const { groups } = kwargs;
      selectedGroupsRef.current = groups;
      level = groups.length >= 1
        ? groups[groups.length - 1].level + 1
        : 0;
    } else if ('level' in kwargs) {
      level = kwargs.level;
    }
    setActiveLevel(level);

    if ('layoutConfig' in kwargs) {
      updateLayoutConfig(activeLevel.current, kwargs.layoutConfig);
    }

    hideCurrentNodes(currentConditions);

    // if ('optionalGroupVisibility' in (value ?? {})) {
    //   optionalGroupsVisible.current = value ?? false;
    // }

    // const save = {
    //   activeLevel: activeLevel?.current ?? 0,
    //   layoutConfig: {
    //     direction: layoutConfig?.current?.direction ?? null,
    //     rectTransformations: layoutConfig?.current?.rectTransformations?.reduce((acc, { type }) =>
    //       [
    //         TransformRectTypeEnum.LAYOUT_TREE,
    //         TransformRectTypeEnum.LAYOUT_WAVE,
    //         TransformRectTypeEnum.LAYOUT_RECTANGLE,
    //         TransformRectTypeEnum.LAYOUT_GRID,
    //         TransformRectTypeEnum.LAYOUT_SPIRAL,
    //       ].includes(type) ? acc.concat({ type } as any) : acc,
    //       []),
    //   },
    //   optionalGroupsVisible: optionalGroupsVisible?.current ?? false,
    // };

    // set(builderLocalStorageKey(pipelineUUID), save);

    // const val = optionalGroupsVisible?.current ?? false;
    // if (val) {
    //   containerRef?.current?.classList.remove(stylesBuilder['optional-hidden']);
    // } else {
    //   containerRef?.current?.classList.add(stylesBuilder['optional-hidden']);
    // }
  }

  function setActiveLevel(levelArg?: number) {
    const levelPrevious: number = activeLevel?.current ?? null;
    levelPrevious !== null &&
      containerRef?.current?.classList.remove(stylesBuilder[`level-${levelPrevious}-active`]);

    let level: number = levelArg ?? (activeLevel?.current ?? 0);
    if (validLevels?.current?.length >= 1) {
      const idx = validLevels.current.findIndex(i => i === level);
      level = validLevels.current[idx + 1] ?? validLevels.current[0];
    } else {
      level += (levelArg === null ? 1 : 0);
      if (level >= validLevels?.current?.length) {
        level = 0;
      }
    }

    activeLevel.current = level;
  }

  function updateLayoutConfig(level: number, config: LayoutConfigType) {
    layoutConfigs.current[level] = {
      ...layoutConfigs.current[level],
      ...config,
    };
  }

  function hideCurrentNodes(conditions) {
    const nodes = Object.values(itemsRef?.current ?? {});

    const nodesToHide = nodes.filter(item => displayable(item, conditions));
    dispatchAppEvent(CustomAppEventEnum.HIDE_NODES, {
      nodes: nodesToHide,
    });

    filterNodesToBeMounted({ detail: { nodes } } as any);
  }

  function buildDisplayableConditions() {
    const cnsets = [];
    const cnbase = [
      levelClassName(activeLevel?.current),
      statusClassName(ItemStatusEnum.READY),
    ];
    const level = activeLevel.current;
    const conditions = [];

    const selectedGroups = selectedGroupsRef?.current;
    const group = selectedGroups?.length >= 1 ? selectedGroups?.[selectedGroups?.length - 1] : null;

    if (event && group) {
      if (group?.uuid) {
        const blocksInGroup = Object.values(blocksByGroupRef?.current?.[group.uuid] ?? {}) ?? [];
        const count = blocksInGroup.length;

        // Default
        cnsets.push([
          ...cnbase,
          groupClassName(group?.uuid),
          nodeTypeClassName(ItemTypeEnum.NODE),
        ]);
        conditions.push({
          block: {
            groups: [group.uuid],
          },
          level,
          type: ItemTypeEnum.NODE,
        });

        // Group has blocks
        if (count >= 1) {
          ITEM_TYPES.forEach(type => {
            cnsets.push([
              ...cnbase,
              groupClassName(group?.uuid),
              nodeTypeClassName(type),
            ]);
          });
          conditions.push({
            block: {
              uuid: group.uuid,
            },
            level,
            type: ItemTypeEnum.NODE,
          });
          conditions.push({
            block: {
              groups: [group.uuid],
            },
            level,
            type: ItemTypeEnum.BLOCK,
          });
        }
        // console.log('Selected group', group?.uuid, count, blocksInGroup, conditions)

        // Get sibling groups so that we can teleport to those.
        const parentUUID = group?.groups?.[group?.groups?.length - 1]?.uuid;
        if (parentUUID) {
          conditions.push({
            block: {
              groups: [parentUUID],
            },
            level,
            type: ItemTypeEnum.NODE,
          });
          cnsets.push([
            ...cnbase,
            groupClassName(parentUUID),
            nodeTypeClassName(ItemTypeEnum.NODE),
          ]);
        }
      }
    } else {
      // If nothing selected, then its level 0
      cnsets.push([
        ...cnbase,
        nodeTypeClassName(ItemTypeEnum.NODE),
      ]);
      conditions.push({
        level,
        type: ItemTypeEnum.NODE,
      });
    }

    return conditions;
  }

  function filterNodesToBeMounted(event?: CustomAppEvent) {
    const { detail } = event ?? {};
    const { manager, nodes, blocksRemoved } = detail ?? {};

    if (!isEmptyObject(blocksRemoved)) {
      dispatchAppEvent(CustomAppEventEnum.UPDATE_NODE_LAYOUTS, {
        nodes: getDisplayableNodes(),
        options: {
          kwargs: {
            conditions: buildDisplayableConditions(),
          },
        },
      });
      return;
    }

    // const payload: {
    //   classNames?: string[];
    //   styles?: string;
    // } = {};


    // DEBUG.settings.manager && console.log(level, cnsets, selectedGroups)

    // const individualContainerClassNames =
    //   cnsets.flatMap(cn => cn.flatMap(buildContainerClassName));
    // // .ctn--grp--tokenization.ctn--lvl--3.ctn--nty--node.ctn--sts--ready
    // // .ctn--grp--tokenization.ctn--lvl--3.ctn--nty--block.ctn--sts--ready
    // const cncons = [];
    // // .grp--tokenization.lvl--3.nty--node.sts--ready
    // // .grp--tokenization.lvl--3.nty--block.sts--ready
    // const cnames = [];

    // cnsets.forEach(cns => {
    //   // .ctn--grp--tokenization.ctn--lvl--3.ctn--nty--node.ctn--sts--ready
    //   const cncon = cns.map(buildContainerClassName).map(cn => `.${cn}`).join('');
    //   cncons.push(cncon);

    //   // .grp--tokenization.lvl--3.nty--node.sts--ready
    //   const cn = cns.map(cn => `.${cn}`).join('');
    //   cnames.push(cn);
    // });

    // const selectedGroupStyles = '' ??
    //   group ? `&.${uuidClassName(group?.uuid)}.${nodeTypeClassName(ItemTypeEnum.NODE)} {
    //     max-height: none;
    //   }` : '';
    // if (group?.uuid) {
    //   cncons.push(buildContainerClassName(uuidClassName(group?.uuid)));
    // }

    // const cncon = cncons.join(',\n');
    // const cn = cnames.join(',\n');
    // const styles = `
    //   ${cncon} {

    //     ${cn} {
    //       opacity: 1;
    //       pointer-events: auto;
    //       visibility: visible;
    //       z-index: 2;

    //       ${selectedGroupStyles}

    //       &.${nodeTypeClassName(ItemTypeEnum.APP)} {
    //         z-index: 5;
    //       }
    //       &.${nodeTypeClassName(ItemTypeEnum.OUTPUT)} {
    //         z-index: 4;

    //         /* @keyframes start {
    //           from {
    //             opacity: 1;
    //           }
    //           to {
    //             opacity: 0;
    //           }
    //         } */

    //         &.hidden {
    //           /* animation: start 1s forwards; */
    //           opacity: 0;
    //           max-height: none;
    //           pointer-events: none;
    //           visibility: hidden;
    //           z-index: -1;
    //         }
    //       }
    //       &.${nodeTypeClassName(ItemTypeEnum.BLOCK)} {
    //         z-index: 3;
    //       }
    //     }
    //   }
    // `;

    // payload.classNames = individualContainerClassNames;
    // payload.styles = styles;

    // resetContainerClassNames();
    // setStyles();
    // addContainerClassNames();

    const conditions = buildDisplayableConditions();
    const filter = items => items?.filter(item => displayable(item, conditions));

    const items = nodes ? filter(nodes) : [];
    if (items?.length > 0) {
      // If all already have been mounted, all we need to do is have the Canvas update the state.
      // We don’t need to update the layout.
      dispatchAppEvent(CustomAppEventEnum.NODE_LAYOUTS_CHANGED, {
        nodes: items,
      });
    } else {
      dispatchAppEvent(CustomAppEventEnum.UPDATE_NODE_LAYOUTS, {
        event: convertEvent(event),
        nodes: filter(Object.values(manager?.itemsRef?.current ?? {}) ?? []),
        options: {
          kwargs: {
            ...(conditions?.length === 0 ? null : { conditions }),
            // ...payload,
          },
        },
      });
    }
  }

  function getDisplayableNodes(): NodeItemType[] {
    const nodes = Object.values(itemsRef?.current ?? {});
    const conditions = buildDisplayableConditions();
    return nodes?.filter(item => displayable(item, conditions));
  }

  function handleNodeMountedPreviously(event) {
    const nodes = getDisplayableNodes();
    const ready = nodes?.every(item => ItemStatusEnum.READY === item.status);
    // Trigger a layout update if some nodes require a layout update.

    dispatchAppEvent(CustomAppEventEnum.UPDATE_NODE_LAYOUTS, {
      event: convertEvent(event),
      nodes,
      options: {
        kwargs: {
          conditions: buildDisplayableConditions() ?? null,
        },
      },
    });
    // if (ready) {
    //   dispatchAppEvent(CustomAppEventEnum.NODE_RECT_UPDATED, {
    //     nodes,
    //   });
    // } else {
    // }
  }

  function defaultStylesAndContainerClassNames() {
    const cns = ITEM_TYPES.map(nodeTypeClassName);
    const cncons = cns.map(buildContainerClassName);
    const cnconsand = cncons.map(cn => `.${cn}`).join('');
    const cnsor = cns.map(cn => `.${cn}`).join(',\n');
    const styles = `
    ${cnconsand} {
      ${cnsor},
      ${LINE_CLASS_NAME} {
        opacity: 0;
        max-height: none;
        pointer-events: none;
        visibility: hidden;
        z-index: -1;
      }
    }`;

    return {
      classNames: cncons,
      styles,
    };
  }

  function addContainerClassNames(classNames?: string[]) {
    [
      ...(classNames ?? []),
      ...defaultStylesAndContainerClassNames().classNames
    ].forEach(cn => containerRef?.current?.classList.add(cn));
  }

  function setStyles(styles?: string) {
    if (!styleRootRef?.current) {
      styleRootRef.current = document.getElementById(STYLE_ROOT_ID) as HTMLStyleElement;
    }
    styleRootRef.current.textContent = [
      defaultStylesAndContainerClassNames().styles,
      styles ?? '',
    ].join('\n');
  }

  function resetContainerClassNames() {
    extractContainerClassNames(
      [...((containerRef?.current?.classList ?? []) as string[])],
    )?.forEach(cn => {
      containerRef?.current?.classList?.remove(cn);
    });
  }

  function teleportIntoBlock(event: CustomAppEvent, blockArg?: BlockType) {
    const block = blockArg ?? event?.detail?.block;

    const groups = [...(selectedGroupsRef.current ?? [])];
    const parentIndex =
      groups?.findIndex(g => !!(g as any).children?.find(i => i.uuid === block?.uuid));

    let index = null;
    let parent = null;
    let groups2 = [...groups];
    if (parentIndex >= 0) {
      groups2 = groups2.slice(0, parentIndex + 1);
      parent = groups[parentIndex];
      index = parent.children.findIndex(i => i.uuid === block?.uuid);
    }

    dispatchAppEvent(CustomAppEventEnum.UPDATE_HEADER_NAVIGATION, {
      event: convertEvent(event),
      options: {
        kwargs: {
          defaultGroups: [
            ...groups2,
            {
              groups: parent ? [parent] : [],
              index,
              level: groups2?.length ?? 0,
              uuid: block?.uuid,
            },
          ],
        },
      },
    });
  }

  return {
    activeLevel,
    controls,
    layoutConfigs,
    selectedGroupsRef,
  };
}
