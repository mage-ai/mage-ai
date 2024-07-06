import React, { useRef, useEffect } from 'react';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { LayoutConfigType } from '../../Canvas/interfaces';
import { levelClassName, groupClassName, nodeTypeClassName, statusClassName } from '../../Canvas/Nodes/utils';
import { get, set } from '@storage/localStorage';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { STYLE_ROOT_ID } from '@context/v2/Style';
import { getCache } from '@mana/components/Menu/storage';
import { LayoutConfigRef, SettingsManagerType } from './interfaces';
import {
  ItemTypeEnum, ItemStatusEnum,
  LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum,
  LayoutDisplayEnum, TransformRectTypeEnum
} from '../../Canvas/types';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { Root, createRoot } from 'react-dom/client';
import { BlockTypeEnum } from '@interfaces/BlockType';

function builderLocalStorageKey(uuid: string) {
  return `pipeline_builder_canvas_local_settings_${uuid}`;
}

export default function useSettingsManager({
  canvasRef,
  containerRef,
  executionFrameworkUUID,
  pipelineUUID,
}: {
  canvasRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  executionFrameworkUUID: string;
  pipelineUUID: string;
}): SettingsManagerType {
  function defaultLayoutConfig() {
    return {
      containerRef,
      direction: LayoutConfigDirectionEnum.VERTICAL,
      display: LayoutDisplayEnum.SIMPLE,
      gap: { column: 40, row: 40 },
      origin: LayoutConfigDirectionOriginEnum.LEFT,
      rectTransformations: null,
      viewportRef: canvasRef,
    };
  }

  const styleRootRef = useRef<HTMLStyleElement>(null);

  const groups = getCache([executionFrameworkUUID, pipelineUUID].join(':'));
  const selectedGroupsRef = useRef<MenuGroupType[]>(groups);
  const activeLevel = useRef<number>(selectedGroupsRef?.current?.length ?? 0);

  const validLevels = useRef<number[]>(null);
  const layoutConfigs = useRef<LayoutConfigRef[]>([
    useRef<LayoutConfigType>(defaultLayoutConfig()),
    useRef<LayoutConfigType>(defaultLayoutConfig()),
    useRef<LayoutConfigType>(defaultLayoutConfig()),
  ]);
  const optionalGroupsVisible = useRef<boolean>(null);

  const {
    convertEvent,
    dispatchAppEvent,
  } = useAppEventsHandler({
    activeLevel,
    layoutConfig: layoutConfigs?.current?.[activeLevel?.current ?? 0],
    layoutConfigs,
    selectedGroupsRef,
  } as SettingsManagerType, {
    [CustomAppEventEnum.NODE_RECT_UPDATED]: updateVisibleNodes,
    [CustomAppEventEnum.UPDATE_SETTINGS]: updateLocalSettings,
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
  //

  function updateLocalSettings(event: CustomAppEvent) {
    const { options } = event?.detail ?? {};
    const {
      groups,
      layoutConfig: layoutConfigData,
      level,
    } = options?.kwargs ?? {};

    if (groups ?? false) {
      selectedGroupsRef.current = groups
    }

    const lvl = !!groups ? groups.length - 1 : level;
    setActiveLevel(lvl);
    layoutConfigData && updateLayoutConfig(lvl, layoutConfigData);

    updateLayout(event);

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

  function updateVisibleNodes(event?: CustomAppEvent) {
    const level = activeLevel.current;
    const display = layoutConfigs?.current?.[level]?.current?.display ?? LayoutDisplayEnum.SIMPLE;

    const classNames = [
      stylesBuilder[`display-${display}`],
      stylesBuilder[`level-${level}-active`],
    ];
    const dynamicClassNames: string[] = [];
    const conditions = [];

    if (event && selectedGroupsRef?.current) {
      const groups = selectedGroupsRef?.current;
      const group = groups?.[groups?.length - 1];

      if (group) {
        conditions.push({
          block: {
            groups: [group.uuid],
          },
          level,
          type: ItemTypeEnum.NODE,
        });

        [
          groupClassName(group?.uuid),
          levelClassName(activeLevel?.current),
          nodeTypeClassName(ItemTypeEnum.NODE),
          statusClassName(ItemStatusEnum.READY),
        ].forEach((cn: string) => {
          dynamicClassNames.push(cn);
          classNames.push(`ctn--${cn}`);
        });

        if (!styleRootRef?.current) {
          styleRootRef.current = document.getElementById(STYLE_ROOT_ID) as HTMLStyleElement;
        }

        const ctncns = dynamicClassNames.map(cn => `ctn--${cn}`).join('.');
        const cns = dynamicClassNames.join('.');
        const styles = dynamicClassNames?.length === 0 ? '' : `
          .${ctncns} {
            .${cns} {
              opacity: 1;
              pointer-events: auto;
              visibility: visible;
              z-index: 6;

              .codeExecuted {
                .outputContainer {
                  visibility: visible;
                  opacity: 1;
                  pointer-events: all;
                  z-index: 6;
                }
              }

              .outputContainer {
                visibility: hidden;
                opacity: 0;
                pointer-events: none;
                z-index: -1;
              }
            }
          }
        `;
        styleRootRef.current.textContent = styles;
      }
    }

    classNames.forEach((className: string) => containerRef?.current?.classList.add(className));

    updateLayout(event, conditions);
  }

  function updateLayout(event: CustomAppEvent, conditions?: {
    block?: {
      groups?: string[];
      type?: BlockTypeEnum;
    };
    level?: number;
    type?: ItemTypeEnum;
  }[]) {
    dispatchAppEvent(CustomAppEventEnum.UPDATE_NODE_LAYOUTS, {
      event: convertEvent(event),
      options: {
        kwargs: {
          conditions,
        },
      },
    });
  }

  return {
    activeLevel,
    layoutConfig: layoutConfigs?.current?.[activeLevel?.current ?? 0],
    layoutConfigs,
    selectedGroupsRef,
  };
}
