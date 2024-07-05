import React, { useRef } from 'react';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { LayoutConfigType } from '../../Canvas/interfaces';
import { get, set } from '@storage/localStorage';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { getCache } from '@mana/components/Menu/storage';
import { LayoutConfigRef, SettingsManagerType } from './interfaces';
import { filterDisplayableNodes } from './utils/display';
import {
  LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum,
  LayoutDisplayEnum, TransformRectTypeEnum
} from '../../Canvas/types';
import { MenuGroupType } from '@mana/components/Menu/interfaces';

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
  const groups = getCache([executionFrameworkUUID, pipelineUUID].join(':'));
  const selectedGroupRef = useRef<MenuGroupType>(groups?.[groups?.length - 1]);
  const activeLevel = useRef<number>(
    (selectedGroupRef?.current?.level ?? false)
      ? selectedGroupRef?.current?.level + 1
      : 0
  );

  const validLevels = useRef<number[]>(null);
  const layoutConfigs = useRef<LayoutConfigRef[]>([
    useRef<LayoutConfigType>({
      containerRef,
      direction: LayoutConfigDirectionEnum.VERTICAL,
      display: LayoutDisplayEnum.SIMPLE,
      gap: { column: 40, row: 40 },
      origin: LayoutConfigDirectionOriginEnum.LEFT,
      rectTransformations: null,
      viewportRef: canvasRef,
    }),
    useRef<LayoutConfigType>(null),
    useRef<LayoutConfigType>(null),
  ]);
  const layoutConfig = layoutConfigs?.current?.[activeLevel?.current ?? 0];
  const optionalGroupsVisible = useRef<boolean>(null);

  const {
    convertEvent,
    dispatchAppEvent,
  } = useAppEventsHandler({
    activeLevel,
    layoutConfig,
    selectedGroupRef,
  } as SettingsManagerType, {
    [CustomAppEventEnum.NODE_LAYOUTS_CHANGED]: updateVisibleNodes,
    [CustomAppEventEnum.NODE_RECT_UPDATED]: handleUpdatedNodeRect,
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
  function updateLayout() {
    dispatchAppEvent(CustomAppEventEnum.UPDATE_NODE_LAYOUTS, {
      event: convertEvent(event),
    });
  }

  function updateLocalSettings(event: CustomAppEvent) {
    const { options } = event?.detail ?? {};
    const {
      group,
      layoutConfig: layoutConfigData,
      level,
    } = options?.kwargs ?? {};

    if (group ?? false) {
      selectedGroupRef.current = group;
    }

    setActiveLevel((group?.level ?? false) ? (group.level + 1) : level);
    layoutConfigData && updateLayoutConfig(layoutConfigData);

    updateLayout();

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

  function updateLayoutConfig(config: LayoutConfigType) {
    layoutConfig.current = {
      ...layoutConfig.current,
      ...config,
    };
  }

  function handleUpdatedNodeRect(event: CustomAppEvent) {
    updateLayout();
    updateVisibleNodes();
  }

  function updateVisibleNodes(event?: CustomAppEvent) {
    if (event) {
      const { node, nodes } = event?.detail ?? {};

      const items = filterDisplayableNodes([
        ...(node ? [node] : []),
        ...(nodes ?? []),
      ], {
        layoutConfig: layoutConfig?.current,
        level: activeLevel?.current,
        selectedGroup: selectedGroupRef?.current,
      });

      console.log('IIIIIIIIIIIIIIIIIIIIIIIIIIIIII', items);
    }

    containerRef?.current?.classList.add(stylesBuilder[`level-${activeLevel.current}-active`]);
    containerRef?.current?.classList.add(
      stylesBuilder[`display-${layoutConfig.current.display ?? LayoutDisplayEnum.SIMPLE}`]);
  }

  return {
    activeLevel,
    layoutConfig,
    selectedGroupRef,
  };
}
