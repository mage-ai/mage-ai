import React, { createRef, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { motion } from 'framer-motion';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { nodeClassNames } from '../../Canvas/Nodes/utils';
import { ConnectionLines, LinePathType, linePathKey } from '../../Canvas/Connections/ConnectionLines';
import {
  LayoutStyleEnum,
  ItemStatusEnum, LayoutDisplayEnum, LayoutConfigDirectionEnum, ItemTypeEnum
} from '../../Canvas/types';
import { LayoutConfigType, NodeItemType, OutputNodeType } from '@components/v2/Canvas/interfaces';
import { getBlockColor } from '@mana/themes/blocks';
import { getPathD } from '../../Canvas/Connections/utils';
import { indexBy, sortByKey, uniqueArray } from '@utils/array';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { LayoutManagerType } from './interfaces';
import { LINE_CLASS_NAME } from './utils/display';
import { DEBUG } from '../../utils/debug';
import { ignoreKeys, selectKeys } from '@utils/hash';

const BASE_Z_INDEX = 2;
const ORDER = {
  [ItemTypeEnum.NODE]: 0,
  [ItemTypeEnum.BLOCK]: 1,
  [ItemTypeEnum.OUTPUT]: 1,
}

function getLineID(nodeID: string, downstreamID: string) {
  return [nodeID, downstreamID].join('->');
}

export default function LineManager() {
  const { activeLevel, layoutConfigs, selectedGroupsRef } = useContext(SettingsContext);
  const { outputsRef } = useContext(ModelContext);
  const selectedGroup = selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1];
  const layoutConfig = layoutConfigs?.current?.[activeLevel?.current];
  const { direction, display, style } = layoutConfig?.current ?? {};

  const timeoutRef = useRef(null);
  const lineRefs = useRef<Record<string, React.RefObject<SVGPathElement>>>({});

  const [linesBlock, setLinesBlock] = useState<Record<string, LinePathType>>({});
  const [linesNode, setLinesNode] = useState<Record<string, LinePathType>>({});
  const [linesOutput, setLinesOutput] = useState<Record<string, LinePathType>>({});

  function updateLines({ detail }: CustomAppEvent) {
    // const { itemElementsRef } = detail?.manager;

    const nodes = detail?.nodes?.filter(({ status }) => ItemStatusEnum.READY === status);
    const nodesMapping = indexBy(nodes, n => n.id);
    const nodesByBlock = indexBy(nodes, n => n?.block?.uuid);

    const pairsByType = {
      [ItemTypeEnum.BLOCK]: [],
      [ItemTypeEnum.NODE]: [],
      [ItemTypeEnum.OUTPUT]: [],
    } as any;

    nodes?.forEach((node: NodeItemType) => {
      // Lines for groups
      if (ItemTypeEnum.NODE === node?.type) {
        node?.downstream?.forEach((downstreamID: string) => {
          const node2 = nodesMapping?.[downstreamID];
          if (!node2) return;

          pairsByType[node.type].push([node, node2]);
        });
      } else if (LayoutDisplayEnum.DETAILED === display && ItemTypeEnum.BLOCK === node?.type) {
        const { block } = node;

        const outputs = Object.values(outputsRef?.current?.[node?.id] ?? {});
        if (outputs?.length > 0) {
          outputs?.forEach((output: OutputNodeType) => {
            DEBUG.lines.manager && console.log('line.output', output, node);

            pairsByType[output.type].push([node, output]);
          });
        }

        (block as any)?.downstream_blocks?.forEach((blockUUID: string) => {
          const node2 = nodesByBlock?.[blockUUID];

          if (!node2) return;

          const block2 = node2?.block;

          DEBUG.lines.manager && console.log('selectedGroup', selectedGroup);

          // Don’t draw lines if blocks aren’t in the same active group.
          if (!(block as any)?.groups?.some(
            (guuid: GroupUUIDEnum) => block2?.groups?.includes(guuid)
              && (!selectedGroup || selectedGroup?.uuid === guuid)
          )) {
            return;
          }

          pairsByType[node.type].push([node, node2]);
        });
      }
    });

    renderPaths(pairsByType, {
      replace: false,
    });
  }

  function renderPaths(pairsByType: {
    [ItemTypeEnum.BLOCK]?: [NodeItemType, NodeItemType][],
    [ItemTypeEnum.NODE]?: [NodeItemType, NodeItemType][],
    [ItemTypeEnum.OUTPUT]?: [NodeItemType, NodeItemType][],
  }, opts?: { replace?: boolean }) {
    const paths = {
      [ItemTypeEnum.BLOCK]: {},
      [ItemTypeEnum.NODE]: {},
      [ItemTypeEnum.OUTPUT]: {},
    };

    Object.entries(pairsByType ?? {})?.forEach(([type, pairs]) => {
      sortByKey(pairs, (pair: [NodeItemType, NodeItemType]) => {
        const idx = ORDER[pair[0]?.type];
        return [
          idx >= 0 ? idx : Object.keys(ORDER).length,
          LayoutConfigDirectionEnum.VERTICAL === direction
            ? pair[0]?.rect?.top
            : pair[0]?.rect?.left,
        ].join('_')
      })?.forEach(
        ([node, node2], index: number) => {
          const linePath = renderLine(node, node2, index, {
            direction, display, style
          });

          paths[type][linePath.id] = linePath;
        });
    });

    if (opts?.replace) {
      setLinesBlock(paths[ItemTypeEnum.BLOCK]);
      setLinesNode(paths[ItemTypeEnum.NODE]);
      setLinesOutput(paths[ItemTypeEnum.OUTPUT]);
    } else {
      setLinesBlock((prev) => ({
        ...prev,
        ...paths[ItemTypeEnum.BLOCK],
      }));
      setLinesNode((prev) => ({
        ...prev,
        ...paths[ItemTypeEnum.NODE],
      }));
      setLinesOutput((prev) => ({
        ...prev,
        ...paths[ItemTypeEnum.OUTPUT],
      }));
    }
  }

  function renderLine(
    node: NodeItemType,
    node2: NodeItemType,
    index: number,
    opts?: {
      direction?: LayoutConfigType['direction'];
      display?: LayoutConfigType['display'];
      style?: LayoutConfigType['style'];
    },
  ): LinePathType {
    const { block } = node;
    const { block: block2 } = node2;
    const isOutput = ItemTypeEnum.OUTPUT === node2?.type;

    const rect = new DOMRect(
      node?.rect?.left,
      node?.rect?.top,
      node?.rect?.width,
      node?.rect?.height
    );
    const rect2 = new DOMRect(
      node2?.rect?.left,
      node2?.rect?.top,
      node2?.rect?.width,
      node2?.rect?.height
    );

    DEBUG.lines.manager && console.log(node.id, node?.rect?.height, rect?.height)

    const paths = [];
    const lineID = getLineID(node.id, node2.id);

    const gradientID = `${lineID}-grad`;
    const colors = [];

    if (isOutput) {
      colors.push('greenmd');
    } else {
      [block, block2]?.forEach(b => {
        const color = getBlockColor(
          (b as any)?.type ?? BlockTypeEnum.GROUP, { getColorName: true },
        )?.names?.base;
        if (color && !colors.includes(color)) {
          colors.push(color);
        }
      });
    }

    const fromRect = rect;
    const toRect = rect2;

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
    if (rect2.top < rect.top) {
      // rect2 is above rect
      positions[LayoutConfigDirectionEnum.VERTICAL] = ['top', 'bottom'];
    } else if (rect2.top > rect.top) {
      // rect2 is below rect
      positions[LayoutConfigDirectionEnum.VERTICAL] = ['bottom', 'top'];
    }

    if (rect2.left < rect.left) {
      // rect2 is to the left of rect
      positions[LayoutConfigDirectionEnum.HORIZONTAL] = ['left', 'right'];
    } else if (rect2.left > rect.left) {
      // rect2 is to the right of rect
      positions[LayoutConfigDirectionEnum.HORIZONTAL] = ['right', 'left'];
    }

    const { direction, display, style } = opts ?? {};
    const [fromPosition, toPosition] = positions[direction];
    // if (!isOutput && LayoutDisplayEnum.DETAILED === display && LayoutStyleEnum.WAVE === style) {
    //   fromPosition = 'right';
    //   toPosition = 'left';
    // }

    const pathDOpts = {
      curveControl: isOutput ? 0.5 : 0,
      fromPosition,
      toPosition,
    } as any;

    lineRefs.current[lineID] ||= createRef();
    const lineRef = lineRefs.current[lineID];

    // console.log(lineID, fromRect?.left, fromRect?.top, toRect?.left, toRect?.top)

    const duration = 0.2;
    const motionProps = isOutput ? {} : {
      animate: { pathLength: 1 },
      initial: { pathLength: 0 },
      transition: {
        delay: index * duration,
        duration: duration * ((100 - index) / 100),
        ease: 'easeInOut',
        yoyo: Infinity,
      },
    };

    const dvalue = getPathD(pathDOpts, fromRect, toRect);

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

    paths.push(
      <motion.path
        className={[LINE_CLASS_NAME].concat(nodeClassNames(node)).filter(Boolean).join(' ')}
        d={dvalue}
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
        {...motionProps}
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
    };
  }

  function handleLayoutChange(event: CustomAppEvent) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateLines(event);
    }, 500);
  }

  function handleOutputUpdated({ detail }: CustomAppEvent) {
    const { node, output } = detail;

    renderPaths({
      [ItemTypeEnum.OUTPUT]: [
        [node, output],
      ],
    });
  }

  useAppEventsHandler({ lineRefs } as any, {
    [CustomAppEventEnum.CLOSE_OUTPUT]: ({ detail: { node, output } }: CustomAppEvent) => {
      setLinesOutput((prev) => ignoreKeys(prev, [getLineID(node.id, output.id)]));
    },
    [CustomAppEventEnum.NODE_LAYOUTS_CHANGED]: handleLayoutChange,
    [CustomAppEventEnum.OUTPUT_UPDATED]: handleOutputUpdated
  });

  useEffect(() => {
    const timeout = timeoutRef.current;
    return () => timeout && clearTimeout(timeout);
  }, []);

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
