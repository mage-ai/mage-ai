import React, { createRef, useContext, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { nodeClassNames } from '../../Canvas/Nodes/utils';
import { ConnectionLines } from '../../Canvas/Connections/ConnectionLines';
import { ItemStatusEnum, LayoutDisplayEnum, LayoutConfigDirectionEnum, ItemTypeEnum } from '../../Canvas/types';
import { ItemMappingType, NodeItemType } from '@components/v2/Canvas/interfaces';
import { getBlockColor } from '@mana/themes/blocks';
import { getPathD } from '../../Canvas/Connections/utils';
import { indexBy, sortByKey, uniqueArray } from '@utils/array';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { LayoutManagerType } from './interfaces';
import { LINE_CLASS_NAME } from './utils/display';
import { DEBUG } from '../../utils/debug';

const BASE_Z_INDEX = 2;
const ORDER = [
  ItemTypeEnum.NODE,
  ItemTypeEnum.BLOCK,
];

function getLineID(nodeID: string, downstreamID: string) {
  return [nodeID, downstreamID].join('->');
}

export default function LineManager() {
  const { activeLevel, layoutConfigs, selectedGroupsRef } = useContext(SettingsContext);
  const selectedGroup = selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1];
  const layoutConfig = layoutConfigs?.current?.[activeLevel?.current];
  const detailLayout = LayoutDisplayEnum.DETAILED === layoutConfig?.current?.display;
  const isVertical = LayoutConfigDirectionEnum.VERTICAL === layoutConfig?.current?.direction;

  const timeoutRef = useRef(null);
  const lineRefs = useRef<Record<string, React.RefObject<SVGPathElement>>>({});
  const [lines, setLines] = useState<{
    [ItemTypeEnum.NODE]: React.ReactNode[];
    [ItemTypeEnum.BLOCK]: React.ReactNode[];
  }>({
    [ItemTypeEnum.NODE]: [],
    [ItemTypeEnum.BLOCK]: [],
  });

  function updateLines({ detail }: CustomAppEvent) {
    const { itemElementsRef } = detail?.manager;

    const nodes = detail?.nodes?.filter(({ status }) => ItemStatusEnum.READY === status);
    const nodesMapping = indexBy(nodes, n => n.id);
    const nodesByBlock = indexBy(nodes, n => n?.block?.uuid);

    const pairsByType = {
      [ItemTypeEnum.NODE]: [],
      [ItemTypeEnum.BLOCK]: [],
    };

    nodes?.forEach((node: NodeItemType) => {
      // Lines for groups
      if (ItemTypeEnum.NODE === node?.type) {
        node?.downstream?.forEach((downstreamID: string) => {
          const node2 = nodesMapping?.[downstreamID];
          if (!node2) return;

          pairsByType[node.type].push([node, node2]);
        });
      } else if (detailLayout && ItemTypeEnum.BLOCK === node?.type) {
        const { block, rect } = node;
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

    const paths = {
      [ItemTypeEnum.NODE]: [],
      [ItemTypeEnum.BLOCK]: [],
    };

    Object.entries(pairsByType ?? {})?.forEach(([type, pairs]) => {
      sortByKey(pairs, (pair: [NodeItemType, NodeItemType]) => {
        const idx = ORDER.indexOf(pair[0]?.type);
        return [
          idx >= 0 ? idx : ORDER.length,
          isVertical
            ? pair[0]?.rect?.top
            : pair[0]?.rect?.left,
        ].join('_')
      })?.forEach(
        ([node, node2], index: number) => {
          paths[type].push(...renderLine(node, node2, index, itemElementsRef));
        });
    })

    setLines(paths);
  }

  function renderLine(
    node: NodeItemType,
    node2: NodeItemType,
    index: number,
    itemElementsRef: LayoutManagerType['itemElementsRef'],
  ) {
    const { block } = node;
    const { block: block2 } = node2;

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
    const colors = uniqueArray([block, block2].map(b => getBlockColor(
      (b as any)?.type ?? BlockTypeEnum.GROUP,
      { getColorName: true })?.names?.base,
    ).filter(Boolean));

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

    const fromRect = rect;
    const toRect = rect2;

    const fromPosition = isVertical ? 'bottom' : 'right';
    const toPosition = isVertical ? 'top' : 'left';
    const pathDOpts = {
      curveControl: 0,
      fromPosition,
      toPosition,
    } as any;

    lineRefs.current[lineID] ||= createRef();
    const lineRef = lineRefs.current[lineID];

    // console.log(lineID, fromRect?.left, fromRect?.top, toRect?.left, toRect?.top)

    const duration = 0.2;
    paths.push(
      <motion.path
        d={getPathD(pathDOpts, fromRect, toRect)}
        fill="none"
        id={lineID}
        key={lineID}
        ref={lineRef}
        stroke={colors?.length >= 2
          ? `url(#${gradientID})`
          : `var(--colors-${colors[0] ?? 'gray'})`
        }
        style={{
          strokeWidth: 1.5,
        }}
        animate={{ pathLength: 1 }}
        initial={{ pathLength: 0 }}
        transition={{
          delay: index * duration,
          duration: duration * ((100 - index) / 100),
          ease: 'easeInOut',
          yoyo: Infinity,
        }}
        className={[LINE_CLASS_NAME].concat(nodeClassNames(node)).filter(Boolean).join(' ')}
      />
    );

    return paths;
  }

  function handleLayoutChange(event: CustomAppEvent) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateLines(event);
    }, 500);
  }

  useAppEventsHandler({ lineRefs } as any, {
    [CustomAppEventEnum.NODE_LAYOUTS_CHANGED]: handleLayoutChange,
  });

  useEffect(() => {
    const timeout = timeoutRef.current;
    return () => timeout && clearTimeout(timeout);
  }, []);

  return (
    <>
      {ORDER.map((type, idx: number) => (
        <ConnectionLines key={type} zIndex={idx + BASE_Z_INDEX}>
          {lines[type]}
        </ConnectionLines   >
      ))}
    </>
  );
}
