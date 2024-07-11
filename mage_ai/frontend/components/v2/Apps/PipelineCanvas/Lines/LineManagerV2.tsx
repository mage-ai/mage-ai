import React, { createRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getUpDownstreamColors } from '../../../Canvas/Nodes/Blocks/utils';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { ModelContext } from '../ModelManager/ModelContext';
import { cubicBezier, motion, useAnimation, useAnimate } from 'framer-motion';
import { SettingsContext } from '../SettingsManager/SettingsContext';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from '../useAppEventsHandler';
import { ConnectionLines, LinePathType, linePathKey } from '../../../Canvas/Connections/ConnectionLines';
import {
  LayoutStyleEnum,
  ItemStatusEnum, LayoutDisplayEnum, LayoutConfigDirectionEnum, ItemTypeEnum
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
import { ignoreKeys, objectSize, selectKeys } from '@utils/hash';
import { calculateBoundingBox } from '@components/v2/Canvas/utils/layout/shared';
import { FrameworkType } from '@interfaces/PipelineExecutionFramework/interfaces';

export const GROUP_NODE_PADDING = 16;
const BASE_Z_INDEX = 1;
const ORDER = {
  [ItemTypeEnum.NODE]: 0,
  [ItemTypeEnum.BLOCK]: 1,
  [ItemTypeEnum.OUTPUT]: 1,
}

function getLineID(upstream: string, downstream: string) {
  return [upstream, downstream].join('->');
}

export default function LineManagerV2({
  rectsMapping,
  selectedGroupRect,
}: {
  rectsMapping: Record<string, RectType>;
  selectedGroupRect: RectType;
}) {
  const { blockMappingRef, blocksByGroupRef, groupMappingRef, outputsRef } = useContext(ModelContext);
  const { layoutConfigsRef, selectedGroupsRef } = useContext(SettingsContext);

  function getLayoutConfig() {
    const layoutConfig = layoutConfigsRef?.current?.[selectedGroupsRef?.current?.length - 1];
    return layoutConfig ?? {};
  }

  const lineRefs = useRef<Record<
    ItemTypeEnum,
    Record<
      string,
      React.MutableRefObject<SVGPathElement>
    >
  >>({} as any);

  const [linesBlock, setLinesBlock] = useState<Record<string, LinePathType[]>>({});
  const [linesNode, setLinesNode] = useState<Record<string, LinePathType[]>>({});
  const [linesOutput, setLinesOutput] = useState<Record<string, LinePathType[]>>({});

  function prepareLinePathProps(
    rectup: RectType,
    rectdn: RectType,
    opts?: {
      direction?: LayoutConfigType['direction'];
      display?: LayoutConfigType['display'];
      style?: LayoutConfigType['style'];
    },
  ) {
    const lineID = getLineID(rectup.id, rectdn.id);
    // console.log(lineID, rectup, rectdn, opts)

    const { block } = rectup;
    const { block: block2 } = rectdn;
    const isOutput = ItemTypeEnum.OUTPUT === rectdn?.type;

    const colors = [];

    if (isOutput) {
      colors.push('greenmd');
    } else {
      [block, block2]?.forEach(b => {
        const color = getBlockColor(
          (b as any)?.type ?? BlockTypeEnum.GROUP, { getColorName: true },
        )?.names?.base;

        if ((!color || colors.includes(color))
          && (BlockTypeEnum.GROUP === block2?.type || !block2?.type)
        ) {
          const {
            downstreamInGroup,
            upstreamInGroup,
          } = getUpDownstreamColors(block, [], blocksByGroupRef?.current, {
            blockMapping: blockMappingRef?.current,
            groupMapping: groupMappingRef?.current,
          });
          colors.push(...(downstreamInGroup?.map(g => g.colorName) ?? []));
        } else if (color && !colors.includes(color)) {
          colors.push(color);
        }
      });
    }

    const fromRect = rectup;
    const toRect = rectdn;

    const positions = {
      [LayoutConfigDirectionEnum.VERTICAL]: [
        'bottom',
        'top',
      ],
      [LayoutConfigDirectionEnum.HORIZONTAL]: [
        'right',
        'left',
      ],
    };

    // Determine relative positions dynamically
    if (rectdn.top < rectup.top) {
      // rectdn is above rect
      positions[LayoutConfigDirectionEnum.VERTICAL] = ['top', 'bottom'];
      positions[LayoutConfigDirectionEnum.HORIZONTAL] = ['right', 'bottom'];
    } else if (rectdn.top > rectup.top) {
      // rectdn is below rect
      positions[LayoutConfigDirectionEnum.VERTICAL] = ['bottom', 'top'];
      positions[LayoutConfigDirectionEnum.HORIZONTAL] = ['right', 'top'];
    }

    if (rectdn.left < rectup.left) {
      // rectdn is to the left of rect
      positions[LayoutConfigDirectionEnum.HORIZONTAL] = ['left', 'right'];
    } else if (rectdn.left > rectup.left) {
      // rectdn is to the right of rect
      positions[LayoutConfigDirectionEnum.HORIZONTAL] = ['right', 'left'];
    }

    const layoutConfig = getLayoutConfig();
    const { direction, display, style } = {
      ...layoutConfig,
      ...opts,
    };
    const [fromPosition, toPosition] = positions[direction];

    const pathDOpts = {
      curveControl: isOutput ? 0.5 : 0,
      fromPosition,
      toPosition,
    } as any;
    const dvalue = getPathD(pathDOpts, fromRect, toRect);

    return {
      colors,
      dvalue,
      fromRect,
      isOutput,
      lineID,
      toRect,
    };
  }

  function renderPaths(pairsByType: {
    [ItemTypeEnum.BLOCK]?: [RectType, RectType][],
    [ItemTypeEnum.NODE]?: [RectType, RectType][],
    [ItemTypeEnum.OUTPUT]?: [RectType, RectType][],
  }, opts?: {
    replace?: boolean;
  }) {
    const paths = {
      [ItemTypeEnum.BLOCK]: {},
      [ItemTypeEnum.NODE]: {},
      [ItemTypeEnum.OUTPUT]: {},
    };

    Object.entries(pairsByType ?? {})?.forEach(([type, pairs]) => {
      sortByKey(pairs, (pair: [RectType, RectType]) => {
        const idx = ORDER[pair[0]?.type];
        return [
          idx >= 0 ? idx : Object.keys(ORDER).length,
          LayoutConfigDirectionEnum.VERTICAL === getLayoutConfig()?.direction
            ? pair[0]?.top
            : pair[0]?.left,
        ].join('_')
      })?.forEach(
        ([rectup, rectdn], index: number) => {
          const linePath = renderLine(rectup, rectdn, index, getLayoutConfig());

          paths[type][rectup.id] ||= []
          paths[type][rectup.id].push(linePath)
        });
    });

    setLinesBlock((prev) => {
      const val = {
        ...(opts?.replace ? {} : prev),
        ...paths[ItemTypeEnum.BLOCK],
      };
      return val;
    });
    setLinesNode((prev) => {
      const val = {
        ...(opts?.replace ? {} : prev),
        ...paths[ItemTypeEnum.NODE],
      };
      return val;
    });
    setLinesOutput((prev) => {
      const val = {
        ...(opts?.replace ? {} : prev),
        ...paths[ItemTypeEnum.OUTPUT],
      };
      return val;
    });
  }

  function renderLine(
    rectup: RectType,
    rectdn: RectType,
    index: number,
    opts?: {
      direction?: LayoutConfigType['direction'];
      display?: LayoutConfigType['display'];
      style?: LayoutConfigType['style'];
    },
  ): LinePathType {
    const paths = [];

    const {
      colors,
      dvalue,
      fromRect,
      isOutput,
      lineID,
      toRect,
    } = prepareLinePathProps(rectup, rectdn, opts);

    // console.log(lineID, fromRect?.left, fromRect?.top, toRect?.left, toRect?.top)

    const gradientID = `${lineID}-grad`;

    if (colors?.length >= 2) {
      paths.push(
        <defs key={`${gradientID}-defs`}>
          <linearGradient id={gradientID} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop
              offset="0%"
              style={{ stopColor: `var(--colors-${colors[1]})`, stopOpacity: 1 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: `var(--colors-${colors[0]})`, stopOpacity: 1 }}
            />
          </linearGradient>
        </defs>
      );
    }

    lineRefs.current[rectdn?.type] ||= {};
    lineRefs.current[rectdn?.type][lineID] ||= createRef();

    const lineRef = lineRefs.current[rectdn.type][lineID];

    if (lineRef?.current) {
      lineRef?.current?.classList?.remove(stylesBuilder.exit);
    }

    paths.push(
      <motion.path
        custom={{
          index,
          isOutput,
        }}
        d={dvalue}
        data-index={index}
        fill="none"
        id={lineID}
        key={lineID}
        ref={lineRef}
        stroke={colors?.length >= 2
          ? `url(#${gradientID})`
          : `var(--colors-${colors[0] ?? 'gray'})`
        }
        style={{
          strokeWidth: isOutput ? 2 : 1.5,
        }}
      />
    );

    const keys = ['left', 'top', 'width', 'height'];

    return {
      id: lineID,
      key: [
        keys?.map(key => Math.round(fromRect?.[key])).map(String).join(':'),
        keys?.map(key => Math.round(toRect?.[key])).map(String).join(':'),
      ].join('->'),
      paths,
      source: rectup,
      target: rectdn,
    };
  }

  const updateLines = useCallback((
    mapping: Record<string, RectType>,
    groupRectArg: RectType,
    opts?: { replace: boolean },
  ) => {
    const pairsByType = {
      [ItemTypeEnum.BLOCK]: [],
      [ItemTypeEnum.NODE]: [],
      [ItemTypeEnum.OUTPUT]: [],
    } as any;

    const selectedGroup = selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1];
    const groupRect = groupRectArg ?? mapping?.[selectedGroup?.id]

    const blocksInGroup = Object.values(blocksByGroupRef?.current?.[groupRect?.id] ?? {}) ?? [];
    const currentGroupChildrenIDs =
      (((groupRect?.block as FrameworkType) ?? {
        children: [],
      })?.children ?? [])?.concat(blocksInGroup ?? [])?.map(child => child.uuid);

    const allRectsAreInGroup = Object.keys(mapping ?? {}).every(
      id => id === groupRect?.id || currentGroupChildrenIDs?.includes(id));
    const values = Object.values({
      ...(mapping ?? {}),
      ...((groupRect && !allRectsAreInGroup) ? { [groupRect.id]: groupRect } : {}),
    });

    // console.log('lines', values)

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
          if (currentGroupChildrenIDs?.includes(rectdn.id)
            && currentGroupChildrenIDs?.includes(rectup1.id)
          ) {
            rectup2 = mapping?.[rectup1.id];
          } else if (!allRectsAreInGroup
            // The upstream block is a child of the currently selected group or
            // the upstream block is the currently selected group.
            && (currentGroupChildrenIDs?.includes(rectup1.id) || rectup1.id === groupRect?.id)
          ) {
            rectup2 = groupRect;
          } else if (
            currentGroupChildrenIDs?.includes(rectdn.id) && !currentGroupChildrenIDs?.includes(rectup1.id)
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
      } else if (ItemTypeEnum.BLOCK === rectdn?.type) {
        const { block: blockdn } = rectdn;

        if (LayoutDisplayEnum.DETAILED === getLayoutConfig()?.display) {
          const outputs = Object.values(outputsRef?.current?.[rectdn?.id] ?? {});
          if (outputs?.length > 0) {
            outputs?.forEach((output: OutputNodeType) => {
              DEBUG.lines.manager && console.log('line.output', output, rectdn);

              pairsByType[output.type].push([rectdn, output]);
            });
          }

        }

        (blockdn as any)?.upstream_blocks?.forEach((upuuid: string) => {
          const rectup = mapping?.[upuuid];

          if (!rectup) return;

          const block2 = blockMappingRef?.current?.[upuuid];

          // Don’t draw lines if blocks aren’t in the same active group.
          if (!(blockdn as any)?.groups?.some(
            (guuid: GroupUUIDEnum) => block2?.groups?.includes(guuid)
              && (!selectedGroup || selectedGroup?.uuid === guuid)
          )) {
            return;
          }

          pairsByType[rectdn.type].push([rectup, rectdn]);
        });
      }
    });

    renderPaths(pairsByType, opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateLines(rectsMapping, selectedGroupRect, {
      replace: true,
    });
  }, [rectsMapping, selectedGroupRect, updateLines]);

  return (
    <>
      <ConnectionLines
        linePaths={linesBlock}
        zIndex={BASE_Z_INDEX + ORDER[ItemTypeEnum.BLOCK]}
      />
      <ConnectionLines
        linePaths={linesNode}
        zIndex={BASE_Z_INDEX + ORDER[ItemTypeEnum.NODE]}
      />
      <ConnectionLines
        linePaths={linesOutput}
        zIndex={BASE_Z_INDEX + ORDER[ItemTypeEnum.OUTPUT]}
      />
    </>
  );
}
