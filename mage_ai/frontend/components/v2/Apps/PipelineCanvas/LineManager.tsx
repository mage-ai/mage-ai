import React, { createRef, useContext, useRef, useState } from 'react';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { ConnectionLines } from '../../Canvas/Connections/ConnectionLines';
import { ItemStatusEnum, LayoutDisplayEnum, LayoutConfigDirectionEnum } from '../../Canvas/types';
import { ItemMappingType, NodeItemType } from '@components/v2/Canvas/interfaces';
import { getBlockColor } from '@mana/themes/blocks';
import { getPathD } from '../../Canvas/Connections/utils';
import { indexBy } from '@utils/array';

type LineMapping = Record<string, React.ReactNode>;

function getLineID(nodeID: string, downstreamID: string) {
  return [nodeID, downstreamID].join('->');
}

export default function LineManager() {
  const { activeLevel, layoutConfigs, selectedGroupsRef } = useContext(SettingsContext);
  const layoutConfig = layoutConfigs?.current?.[activeLevel?.current];
  const detailLayout = LayoutDisplayEnum.DETAILED === layoutConfig?.current?.display;
  const isVertical = LayoutConfigDirectionEnum.VERTICAL === layoutConfig?.current?.direction;

  const lineRefs = useRef<Record<string, React.RefObject<SVGPathElement>>>({});
  const [lines, setLines] = useState<React.ReactNode[]>([]);

  function updateLines({ detail }: CustomAppEvent) {
    const nodes = detail?.nodes?.filter(({ status }) => ItemStatusEnum.READY === status);
    const nodesMapping = indexBy(nodes, n => n.id);

    const paths = [];
    nodes?.forEach((node: NodeItemType) => {
      node?.downstream?.forEach((downstreamID: string) => {
        const node2 = nodesMapping?.[downstreamID];
        if (!node2) return;
        paths.push(...renderLine(node, node2));
      });
    });

    setLines(paths);
  }

  function renderLine(node: NodeItemType, node2: NodeItemType) {
    const { block, rect } = node;
    const { block: block2, rect: rect2 } = node2;

    const paths = [];
    const lineID = getLineID(node.id, node2.id);

    const gradientID = `${lineID}-grad`;
    const colors = [block, block2].map(b => getBlockColor(
      (b as any)?.type, { getColorName: true })?.names?.base,).filter(Boolean);

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

    const fromPosition = isVertical ? 'top' : 'right';
    const toPosition = isVertical ? 'bottom' : 'left';
    const pathDOpts = {
      curveControl: 0,
      fromPosition,
      toPosition,
    } as any;

    lineRefs.current[lineID] ||= createRef();
    const lineRef = lineRefs.current[lineID]

    paths.push(
      <path
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
      />
    );

    console.log(lineID, rect.left, rect.top, rect2.left, rect2.top, lineRef?.current);

    return paths;
  }

  useAppEventsHandler({ lineRefs } as any, {
    [CustomAppEventEnum.NODE_LAYOUTS_CHANGED]: updateLines,
  });

  return (
    <ConnectionLines>
      {lines}
    </ConnectionLines>
  );
}
