import React, {
  createRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BADGE_HEIGHT, PADDING_VERTICAL } from '../../../Canvas/Nodes/BlockNodeV2';
import { getUpDownstreamColors } from '../../../Canvas/Nodes/Blocks/utils';
import stylesPipelineBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { ModelContext } from '../ModelManager/ModelContext';
import { cubicBezier, motion, useAnimation, useAnimate } from 'framer-motion';
import { SettingsContext } from '../SettingsManager/SettingsContext';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from '../useAppEventsHandler';
import {
  ConnectionLines,
  LinePathType,
  linePathKey,
} from '../../../Canvas/Connections/ConnectionLines';
import {
  LayoutStyleEnum,
  ItemStatusEnum,
  LayoutDisplayEnum,
  LayoutConfigDirectionEnum,
  ItemTypeEnum,
} from '../../../Canvas/types';
import { LayoutConfigType, RectType, OutputNodeType } from '@components/v2/Canvas/interfaces';
import { getBlockColor } from '@mana/themes/blocks';
import { getPathD } from '../../../Canvas/Connections/utils';
import { indexBy, sortByKey, unique, uniqueArray } from '@utils/array';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { LayoutManagerType } from '../interfaces';
import { LINE_CLASS_NAME } from '../utils/display';
import { DEBUG } from '../../../utils/debug';
import { deepCopy, ignoreKeys, objectSize, selectKeys } from '@utils/hash';
import { calculateBoundingBox } from '@components/v2/Canvas/utils/layout/shared';
import { FrameworkType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { buildPaths, getLineID, prepareLinePathProps as prepareLinePathPropsBase } from './utils';

const APP_ENABLED = false;
export const EASING = cubicBezier(0.35, 0.17, 0.3, 0.86);
export const ANIMATION_DURATION = 0.2;
const BASE_Z_INDEX = 1;
const ORDER = {
  [ItemTypeEnum.NODE]: 0,
  [ItemTypeEnum.APP]: 1,
  [ItemTypeEnum.BLOCK]: 1,
  [ItemTypeEnum.OUTPUT]: 1,
};

export type UpdateLinesType = (
  mapping: Record<string, RectType>,
  groupRectArg: RectType,
  opts?: {
    callback?: () => void;
    replace?: boolean;
    shouldAnimate?: (rectup: RectType, rectdn: RectType) => boolean;
  },
) => void;

export default function LineManagerV2({
  animate,
  animateLineRef,
  controls: controlsProp,
  renderLineRef,
  rectsMapping,
  selectedGroupRect,
  transformState,
  updateLinesRef,
  visible,
  setAnimationOperations
}: {
  animate?: boolean;
  setAnimationOperations: (ops: Record<string, any>) => void;
  animateLineRef?: React.MutableRefObject<(to: string, from?: string, opts?: { stop?: boolean }) => void>;
  controls?: any
  renderLineRef?: React.MutableRefObject<(rect: RectType) => void>;
  rectsMapping: Record<string, RectType>;
  selectedGroupRect: RectType;
  transformState: React.MutableRefObject<ZoomPanStateType>;
  updateLinesRef?: React.MutableRefObject<UpdateLinesType>;
  visible?: boolean;
}) {
  const { blockMappingRef, blocksByGroupRef, groupMappingRef, outputsRef } =
    useContext(ModelContext);
  const { layoutConfigsRef, selectedGroupsRef } = useContext(SettingsContext);

  const controls = useAnimation();
  const timeoutRef = useRef<any>(null);
  const timeoutAnimateLineRef = useRef<any>(null);

  function getLayoutConfig() {
    const layoutConfig = layoutConfigsRef?.current?.[selectedGroupsRef?.current?.length - 1];
    return layoutConfig ?? {};
  }

  const lineRefs = useRef<
    Record<ItemTypeEnum, Record<string, React.MutableRefObject<SVGPathElement>>>
  >({} as any);

  const [linesApp, setLinesApp] = useState<Record<string, LinePathType[]>>({});
  const [linesBlock, setLinesBlock] = useState<Record<string, LinePathType[]>>({});
  const [linesNode, setLinesNode] = useState<Record<string, LinePathType[]>>({});
  const [linesOutput, setLinesOutput] = useState<Record<string, LinePathType[]>>({});
  const [pathDefs, setPathDefs] = useState<Record<string, any[]>>({});

  const prepareLinePathProps = useCallback(
    (
      rectup: RectType,
      rectdn: RectType,
      opts?: {
        direction?: LayoutConfigType['direction'];
        display?: LayoutConfigType['display'];
        style?: LayoutConfigType['style'];
      },
    ) => prepareLinePathPropsBase(
      rectup,
      rectdn,
      {
        ...opts,
        blocksByGroup: blocksByGroupRef?.current,
        blockMapping: blockMappingRef?.current,
        groupMapping: groupMappingRef?.current,
      },
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function renderPaths(
    pairsByType: {
      [ItemTypeEnum.APP]?: [RectType, RectType][];
      [ItemTypeEnum.BLOCK]?: [RectType, RectType][];
      [ItemTypeEnum.NODE]?: [RectType, RectType][];
      [ItemTypeEnum.OUTPUT]?: [RectType, RectType][];
    },
    opts?: {
      replace?: boolean;
      shouldAnimate: (rectup: RectType, rectdn: RectType) => boolean;
    },
  ): LinePathType[] {
    const linePaths = [];
    const paths = {
      [ItemTypeEnum.APP]: {},
      [ItemTypeEnum.BLOCK]: {},
      [ItemTypeEnum.NODE]: {},
      [ItemTypeEnum.OUTPUT]: {},
    };
    const defs = {};
    const childUUIDs = indexBy(
      selectedGroupsRef?.current?.[selectedGroupsRef.current?.length - 1]?.children ?? [],
      c => c.uuid,
    );

    Object.entries(pairsByType ?? {})?.forEach(([type, pairs]) => {
      sortByKey(pairs, (pair: [RectType, RectType]) => {
        const idx = ORDER[pair[0]?.type];
        return [
          idx >= 0 ? idx : Object.keys(ORDER).length,
          LayoutConfigDirectionEnum.VERTICAL === getLayoutConfig()?.direction
            ? pair[0]?.top
            : pair[0]?.left,
        ].join('_');
      })?.forEach(([rectup, rectdn], index: number) => {
        const linePath = renderLine(rectup, rectdn, index, {
          layout: getLayoutConfig(),
          shouldAnimate: opts?.shouldAnimate,
        });

        defs[rectup.id] = linePath.defs;

        let key = type;
        if (childUUIDs?.[rectup.id]) {
          key = ItemTypeEnum.BLOCK;
        }

        paths[key][rectup.id] ||= [];
        paths[key][rectup.id].push(linePath);

        linePaths.push(linePath);
      });
    });

    // console.log('paths', paths);

    setPathDefs(defs);
    setLinesApp(prev => {
      const val = {
        ...(opts?.replace ? {} : prev),
        ...paths[ItemTypeEnum.APP],
      };
      return val;
    });
    setLinesBlock(prev => {
      const val = {
        ...(opts?.replace ? {} : prev),
        ...paths[ItemTypeEnum.BLOCK],
      };
      return val;
    });
    setLinesNode(prev => {
      const val = {
        ...(opts?.replace ? {} : prev),
        ...paths[ItemTypeEnum.NODE],
      };
      return val;
    });
    setLinesOutput(prev => {
      const val = {
        ...(opts?.replace ? {} : prev),
        ...paths[ItemTypeEnum.OUTPUT],
      };
      return val;
    });

    return linePaths;
  }

  const renderLine = useCallback(
    (
      rectup: RectType,
      rectdn: RectType,
      index: number,
      opts?: {
        layout?: {
          direction?: LayoutConfigType['direction'];
          display?: LayoutConfigType['display'];
          style?: LayoutConfigType['style'];
        };
        shouldAnimate?: (rectup: RectType, rectdn: RectType) => boolean;
      },
    ): LinePathType => buildPaths(
      rectup,
      rectdn,
      index,
      {
        ...opts,
        animate: opts?.shouldAnimate ? controls : controlsProp ?? controls,
        blockMapping: blockMappingRef?.current,
        blocksByGroup: blocksByGroupRef?.current,
        groupMapping: groupMappingRef?.current,
        lineRefs,
      },
    ), [controls, controlsProp, prepareLinePathProps],
  );

  const updateLines = useCallback(
    (
      mapping: Record<string, RectType>,
      groupRectArg: RectType,
      opts?: {
        callback?: () => void;
        replace?: boolean;
        shouldAnimate?: (rectup: RectType, rectdn: RectType) => boolean;
      },
    ) => {
      const pairsByType = {
        [ItemTypeEnum.APP]: [],
        [ItemTypeEnum.BLOCK]: [],
        [ItemTypeEnum.NODE]: [],
        [ItemTypeEnum.OUTPUT]: [],
      } as any;

      const selectedGroup = selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1];
      const groupRect = groupRectArg ?? mapping?.[selectedGroup?.id];

      const blocksInGroup = Object.values(blocksByGroupRef?.current?.[groupRect?.id] ?? {}) ?? [];
      const currentGroupChildrenIDs = (
        (
          (groupRect?.block as FrameworkType) ?? {
            children: [],
          }
        )?.children ?? []
      )
        ?.concat(blocksInGroup ?? [])
        ?.map(child => child.uuid);

      const allRectsAreInGroup = Object.keys(mapping ?? {}).every(
        id => id === groupRect?.id || currentGroupChildrenIDs?.includes(id),
      );
      const values = Object.values({
        ...(mapping ?? {}),
        ...(groupRect && !allRectsAreInGroup ? { [groupRect.id]: groupRect } : {}),
      });

      const outputNodesByBlockUUID = Object.values(mapping ?? {}).reduce(
        (acc, node) => ({
          ...acc,
          ...(ItemTypeEnum.OUTPUT === node?.type
            ? {
                [node?.block?.uuid]: [...(acc?.[node?.block?.uuid] ?? []), node],
              }
            : {}),
        }),
        {},
      );

      // console.log('lines', values);

      values?.forEach((rectdn: RectType) => {
        // Lines for groups
        if (ItemTypeEnum.NODE === rectdn?.type) {
          // e.g. data preparation: displaying this as the selected group, all 4 groups displayed
          // belong inside it, so we show lines between those 4 groups.

          // Skip if rect is in the current group’s children.
          rectdn?.upstream?.forEach(rectup1 => {
            let rectup2 = null;

            // console.log(rectdn.id, rectdn?.upstream, mapping, pairsByType,
            //   allRectsAreInGroup,
            //   currentGroupChildrenIDs?.includes(rectup1.id),
            //   rectup1.id === groupRect?.id,
            // );

            // Current downstream and upstream block is a child of the currently selected group.
            if (
              currentGroupChildrenIDs?.includes(rectdn.id) &&
              currentGroupChildrenIDs?.includes(rectup1.id)
            ) {
              rectup2 = mapping?.[rectup1.id];
            } else if (
              !allRectsAreInGroup &&
              // The upstream block is a child of the currently selected group or
              // the upstream block is the currently selected group.
              (currentGroupChildrenIDs?.includes(rectup1.id) || rectup1.id === groupRect?.id)
            ) {
              rectup2 = groupRect;
            } else if (
              currentGroupChildrenIDs?.includes(rectdn.id) &&
              !currentGroupChildrenIDs?.includes(rectup1.id)
            ) {
              // If downstream block is in the current group’s children and
              // the upstream is not in the current group’s children,
              // then skip.
              return;
            } else {
              rectup2 = mapping?.[rectup1.id];
            }

            if (!rectup2) return;

            pairsByType[rectdn.type].push([rectup2, rectdn]);
          });
        } else if ([
          APP_ENABLED && ItemTypeEnum.APP,
          ItemTypeEnum.BLOCK,
        ].filter(Boolean).includes(rectdn?.type)) {
          const { block: blockdn } = rectdn;

          const outputNodes = outputNodesByBlockUUID?.[blockdn.uuid] ?? [];
          outputNodes?.forEach((output: OutputNodeType) => {
            pairsByType[output.type].push([rectdn, output]);
            // console.log('OUTPUT', rectdn, output, pairsByType);
          });

          (blockdn as any)?.upstream_blocks?.forEach((upuuid: string) => {
            const rectup = mapping?.[upuuid];

            if (!rectup) return;

            const block2 = blockMappingRef?.current?.[upuuid];

            // Don’t draw lines if blocks aren’t in the same active group.
            if (
              !(blockdn as any)?.groups?.some(
                (guuid: GroupUUIDEnum) =>
                  block2?.groups?.includes(guuid) &&
                  (!selectedGroup || selectedGroup?.uuid === guuid),
              )
            ) {
              return;
            }

            pairsByType[rectdn.type].push([rectup, rectdn]);
          });
        }
      });

      // console.log('pairsByType', pairsByType);

      const linePaths = renderPaths(pairsByType, {
        replace: opts?.replace,
        shouldAnimate: opts?.shouldAnimate,
      });

      if (linePaths?.some(r => r.animate)) {
        startAnimating(true);
      }

      opts?.callback && opts?.callback?.();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const startAnimating = useCallback(
    (override?: boolean) => {
      if (animate || override) {
        timeoutRef.current = setTimeout(() => {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;

          controls.stop();
          controls.set(({ animate }) =>
            animate
              ? {
                  opacity: 0,
                  pathLength: 0,
                }
              : {
                  opacity: 1,
                  pathLength: 1,
                },
          );
          controls.start(({ animate, index, isOutput }) => ({
            ease: EASING,
            opacity: 1,
            pathLength: 1,
            transition: animate
              ? {
                  delay: index * ANIMATION_DURATION + (isOutput ? 1 : 0.5),
                  duration: isOutput ? 0.1 : ANIMATION_DURATION * ((100 - index) / 100),
                }
              : { duration: 0 },
          }));
        }, 100);
      } else {
        controls.set({
          opacity: 1,
          pathLength: 1,
        });
      }
    },
    [animate, controls],
  );

  function animateLine(to: string, from?: string, opts?: { stop?: boolean }) {
    const linesMapping = lineRefs?.current?.[to];

    const arr = [];
    if (from) {
      arr.push(...Object.values(linesMapping?.[from] ?? {}));
    } else {
      arr.push(...Object.values(linesMapping ?? {}));
    }

    // console.log('animateLine', to, from, linesMapping, arr)

    arr?.forEach((target) => {
      let startFunc = 'add';
      if (opts?.stop) {
        startFunc = 'remove';
      }

      let tries = 10;

      const work = () => {
        clearTimeout(timeoutAnimateLineRef.current);

        const id = getLineID(from, to)
        const el = document.getElementById(id);
        const bg = document.getElementById(`${id}-background`);

        el && el.classList[startFunc](stylesPipelineBuilder.animateFlow);
        bg && bg.classList[startFunc](stylesPipelineBuilder.animateFlow);

        if (!el && !bg && tries > 0) {
          timeoutAnimateLineRef.current = setTimeout(work, 300);
        } else {
          timeoutAnimateLineRef.current = null;
        }
      };

      timeoutAnimateLineRef.current = setTimeout(work, 0);
    });
  }

  const renderLineForRect = useCallback((rect: RectType, rectMap?: Record<string, RectType>) => {
    // console.log(rect, lineRefs?.current, lineRefs?.current?.[rect.id])
    Object.entries(lineRefs?.current ?? {})?.forEach(([uuid, mapping]) => {
      const arr = [];

      if (uuid === rect.id) {
        // The current rect is the downsstream;
        arr.push(...Object.values(mapping ?? {}));
      } else if (mapping?.[rect.id]) {
        // The current rect is the upstream;
        arr.push(mapping?.[rect.id]);
      }

      arr?.forEach(({
        from: from0,
        backgroundRef,
        to: to0,
        ref,
      }) => {
        const from = {
          ...from0,
          ...rectsMapping?.[from0?.id],
          ...rectMap?.[from0?.id],
        };
        const to = {
          ...to0,
          ...rectsMapping?.[to0?.id],
          ...rectMap?.[to0?.id],
        };

        const from2 = rect?.id === from?.id ? { ...from, ...rect, } : from;
        const to2 = rect?.id === to?.id ? { ...to, ...rect } : to;

        if (from2.id === rect.id) {
          from2.top -= (transformState?.current?.originY?.current ?? 0);
          from2.left -= (transformState?.current?.originX?.current ?? 0);
        } else if (to2.id === rect.id) {
          to2.top -= (transformState?.current?.originY?.current ?? 0);
          to2.left -= (transformState?.current?.originX?.current ?? 0);
        }

        // console.log(from2, to2, transformState.current)

        const dvalue = prepareLinePathProps(from2, to2).dvalue;

        ref?.current?.setAttribute?.('d', dvalue);
        if (backgroundRef?.current) {
          backgroundRef.current.setAttribute('d', dvalue);
        }
      });
    });
  }, [rectsMapping]);

  function animateLineTransitions(opts?: {
    duration?: number;
    preset?: 'blocks' | 'lines';
    reset?: boolean;
  }) {
    // blocks
    // transition: { duration: CHANGE_BLOCKS_ANIMATION_DURATION * latest },
    // translateX: 0,
    // translateY: 0,

    const cntrl = controlsProp ?? controls;

    if (opts?.reset) {
      cntrl.set({ opacity: 0, pathLength: 0 });
    } else {
      cntrl.start(({ index, isOutput }) => ({
        ease: EASING,
        opacity: 1,
        pathLength: 1,
        transition: {
          delay: index * ANIMATION_DURATION + (isOutput ? 1 : 0.5),
          duration: isOutput ? 0.1 : ANIMATION_DURATION * ((100 - index) / 100),
        },
      }));
    }
  }

  useEffect(() => {
    animateLineRef.current = animateLine;
    renderLineRef.current = renderLineForRect;
    updateLinesRef.current = updateLines;

    setAnimationOperations({
      animateLine,
      animateLineTransitions,
      renderLineForRect,
      updateLines,
    });

    updateLines(rectsMapping, selectedGroupRect, {
      replace: true,
    });

    if (visible && !controlsProp) {
      startAnimating();
    }

    const timeout = timeoutRef.current;

    return () => {
      clearTimeout(timeout);
      timeoutRef.current = null;
    };
  }, [
    animateLineRef,
    controlsProp,
    rectsMapping,
    renderLineRef,
    selectedGroupRect,
    startAnimating,
    updateLines,
    updateLinesRef,
    visible,
    setAnimationOperations,
  ]);

  // console.log('ConnectionLines', linesBlock, linesNode, linesOutput, linesApp,
  //   Object.values(pathDefs ?? {}).flatMap(defs => defs),
  // );

  return (
    <>
      <svg>
        {Object.values(pathDefs ?? {}).flatMap(defs => defs)}
      </svg>
      {APP_ENABLED && <ConnectionLines linePaths={linesApp} zIndex={BASE_Z_INDEX + ORDER[ItemTypeEnum.APP]} />}

      <ConnectionLines linePaths={linesBlock} zIndex={2} />
      <ConnectionLines linePaths={linesNode} zIndex={1} />
      <ConnectionLines linePaths={linesOutput} zIndex={BASE_Z_INDEX + ORDER[ItemTypeEnum.OUTPUT]} />
    </>
  );
}
