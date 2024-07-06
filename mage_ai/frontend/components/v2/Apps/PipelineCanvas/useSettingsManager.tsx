import React, { useRef, useEffect } from 'react';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { LayoutConfigType } from '../../Canvas/interfaces';
import { buildContainerClassName, extractContainerClassNames } from './utils/display';
import { levelClassName, groupClassName, nodeTypeClassName, statusClassName } from '../../Canvas/Nodes/utils';
import { get, set } from '@storage/localStorage';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { STYLE_ROOT_ID } from '@context/v2/Style';
import { getCache } from '@mana/components/Menu/storage';
import { LayoutConfigRef, SettingsManagerType } from './interfaces';
import {
  ItemTypeEnum, ItemStatusEnum,
  LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum,
  LayoutDisplayEnum
} from '../../Canvas/types';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { Root, createRoot } from 'react-dom/client';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { DEBUG } from '@components/v2/utils/debug';

function builderLocalStorageKey(uuid: string) {
  return `pipeline_builder_canvas_local_settings_${uuid}`;
}

export default function useSettingsManager({
  canvasRef,
  containerRef,
  executionFrameworkUUID,
  pipelineUUID,
  setHeaderData,
}: {
  canvasRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  executionFrameworkUUID: string;
  pipelineUUID: string;
  setHeaderData?: (data: any) => void;
}): SettingsManagerType {
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
    useRef<LayoutConfigType>(defaultLayoutConfig()),
    useRef<LayoutConfigType>(defaultLayoutConfig({
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
    })),
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
    [CustomAppEventEnum.NODE_LAYOUTS_CHANGED]: handleLayoutUpdates,
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

  function updateLocalSettings(event: CustomAppEvent) {
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

    updateVisibleNodes(event);

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

    addContainerClassNames([
      stylesBuilder[`display-${display}`],
      stylesBuilder[`level-${level}-active`],
    ]);

    const conditions = [];
    const payload: {
      classNames?: string[];
      styles?: string;
    } = {};

    if (event && selectedGroupsRef?.current) {
      const groups = selectedGroupsRef?.current;
      const group = groups?.[groups?.length - 1];

      if (group?.uuid) {
        conditions.push({
          block: {
            groups: [group.uuid],
          },
          level,
          type: ItemTypeEnum.NODE,
        });

        const classNames = [
          groupClassName(group?.uuid),
          levelClassName(activeLevel?.current),
          nodeTypeClassName(ItemTypeEnum.NODE),
          statusClassName(ItemStatusEnum.READY),
        ];

        const {
          container,
          styles,
        } = buildStyles(classNames, ({ and, container }) => `
          .${container} {
            ${and} {
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
                opacity: 0;
                pointer-events: none;
                visibility: hidden;
                z-index: -1;
              }
            }
          }
        `);

        payload.classNames = container;
        payload.styles = styles;

        hideAllNodes();
      }
    }

    dispatchAppEvent(CustomAppEventEnum.UPDATE_NODE_LAYOUTS, {
      event: convertEvent(event),
      options: {
        kwargs: {
          ...(conditions?.length === 0 ? null : { conditions }),
          ...payload,
        },
      },
    });
  }

  function hideAllNodes() {
    const {
      container,
      styles: hideStyles,
    } = buildStyles(
      [ItemTypeEnum.APP, ItemTypeEnum.BLOCK, ItemTypeEnum.NODE, ItemTypeEnum.PORT,
      ItemTypeEnum.OUTPUT].map(nodeTypeClassName),
      ({ container, or }) => `
      .${container} {
        @keyframes start {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        ${or} {
          animation: start 1s forwards;
          opacity: 0;
          pointer-events: none;
          visibility: hidden;
          z-index: -1;
        }
      }
    `);

    // Hide everything
    setStyles(hideStyles);
    addContainerClassNames(container);
  }

  function addContainerClassNames(classNames: string[]) {
    resetContainerClassNames();
    classNames.forEach((className: string) => containerRef?.current?.classList.add(className));
  }

  function handleLayoutUpdates(event: CustomAppEvent) {
    DEBUG.settings.manager && console.log('handleLayoutUpdates', event)
    const { classNames, styles } = event?.detail?.options?.kwargs ?? {};

    classNames && addContainerClassNames(classNames);
    styles && setStyles(styles);
  }

  function buildStyles(
    classNames: string[],
    builder: (opts: { and: string, container: string, or: string, targets: string[] }) => string,
  ): {
    container: string[],
    styles: string,
  } {
    const container = classNames.map(buildContainerClassName);
    const targets = classNames.map(cn => `.${cn}`);
    const and = targets.join('');
    const or = targets.join(',');
    const styles = classNames?.length === 0 ? '' : builder({
      and,
      container: container.join('.'),
      or,
      targets,
    });

    return {
      container,
      styles,
    };
  }

  function setStyles(styles: string) {
    if (!styleRootRef?.current) {
      styleRootRef.current = document.getElementById(STYLE_ROOT_ID) as HTMLStyleElement;
    }
    styleRootRef.current.textContent = styles;
  }

  function resetContainerClassNames() {
    extractContainerClassNames(
      [...((containerRef?.current?.classList ?? []) as string[])],
    )?.forEach(cn => {
      containerRef?.current?.classList?.remove(cn);
    });
  }

  return {
    activeLevel,
    layoutConfigs,
    selectedGroupsRef,
  };
}
