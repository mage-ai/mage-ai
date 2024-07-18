import React, {
  createRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getUpDownstreamColors } from '../../Canvas/Nodes/Blocks/utils';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { ModelContext } from './ModelManager/ModelContext';
import { cubicBezier, motion, useAnimation, useAnimate } from 'framer-motion';
import { SettingsContext } from './SettingsManager/SettingsContext';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { nodeClassNames } from '../../Canvas/Nodes/utils';
import {
  ConnectionLines,
  LinePathType,
  linePathKey,
} from '../../Canvas/Connections/ConnectionLines';
import {
  LayoutStyleEnum,
  ItemStatusEnum,
  LayoutDisplayEnum,
  LayoutConfigDirectionEnum,
  ItemTypeEnum,
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
};

function getLineID(nodeID: string, downstreamID: string) {
  return [nodeID, downstreamID].join('->');
}

export default function LineManager() {
  const { activeLevel, layoutConfigs, selectedGroupsRef } = useContext(SettingsContext);
  const { blocksByGroupRef, groupMappingRef, groupsByLevelRef, outputsRef } =
    useContext(ModelContext);
  const selectedGroup = selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1];
  const layoutConfig = layoutConfigs?.current?.[activeLevel?.current];
  const { direction, display, style } = layoutConfig?.current ?? {};
  const [ready, setState] = useState(false);
  const readyRef = useRef(false);
  const controls = useAnimation();
  const [scope, animate] = useAnimate();

  const lineMappingRef = useRef({});
  const timeoutRef = useRef(null);
  const lineRefs = useRef<
    Record<ItemTypeEnum, Record<string, React.MutableRefObject<SVGPathElement>>>
  >({} as any);

  const [linesBlock, setLinesBlock] = useState<Record<string, LinePathType[]>>({});
  const [linesNode, setLinesNode] = useState<Record<string, LinePathType[]>>({});
  const [linesOutput, setLinesOutput] = useState<Record<string, LinePathType[]>>({});

  function updateLines({ detail }: CustomAppEvent) {
    // const { itemElementsRef } = detail?.manager;
    // ?.filter(({ status }) => ItemStatusEnum.READY === status);

    const { node, nodes } = detail;

    const nodesMapping = indexBy(nodes, n => n.id);
    const nodesByBlock = indexBy(nodes, n => n?.block?.uuid);

    const pairsByType = {
      [ItemTypeEnum.BLOCK]: [],
      [ItemTypeEnum.NODE]: [],
      [ItemTypeEnum.OUTPUT]: [],
    } as any;

    (node ? [node] : nodes)?.forEach((node: NodeItemType) => {
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
          if (
            !(block as any)?.groups?.some(
              (guuid: GroupUUIDEnum) =>
                block2?.groups?.includes(guuid) &&
                (!selectedGroup || selectedGroup?.uuid === guuid),
            )
          ) {
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

  function renderPaths(
    pairsByType: {
      [ItemTypeEnum.BLOCK]?: [NodeItemType, NodeItemType][];
      [ItemTypeEnum.NODE]?: [NodeItemType, NodeItemType][];
      [ItemTypeEnum.OUTPUT]?: [NodeItemType, NodeItemType][];
    },
    opts?: {
      replace?: boolean;
    },
  ) {
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
        ].join('_');
      })?.forEach(([node, node2], index: number) => {
        const linePath = renderLine(node, node2, index, {
          direction,
          display,
          style,
        });

        paths[type][node.id] ||= [];
        paths[type][node.id].push(linePath);
      });
    });

    if (opts?.replace) {
      setLinesBlock(() => {
        const val = paths[ItemTypeEnum.BLOCK] ?? {};
        lineMappingRef.current[ItemTypeEnum.BLOCK] = val;
        return val;
      });
      setLinesNode(() => {
        const val = paths[ItemTypeEnum.NODE] ?? {};
        lineMappingRef.current[ItemTypeEnum.NODE] = val;
        return val;
      });
      setLinesOutput(() => {
        const val = paths[ItemTypeEnum.OUTPUT] ?? {};
        lineMappingRef.current[ItemTypeEnum.OUTPUT] = val;
        return val;
      });
    } else {
      setLinesBlock(prev => {
        const val = {
          ...prev,
          ...paths[ItemTypeEnum.BLOCK],
        };
        lineMappingRef.current[ItemTypeEnum.BLOCK] = val;
        return val;
      });
      setLinesNode(prev => {
        const val = {
          ...prev,
          ...paths[ItemTypeEnum.NODE],
        };
        lineMappingRef.current[ItemTypeEnum.NODE] = val;
        return val;
      });
      setLinesOutput(prev => {
        const val = {
          ...prev,
          ...paths[ItemTypeEnum.OUTPUT],
        };
        lineMappingRef.current[ItemTypeEnum.OUTPUT] = val;
        return val;
      });
    }
  }

  function prepareLinePathProps(
    node: NodeItemType,
    node2: NodeItemType,
    opts?: {
      direction?: LayoutConfigType['direction'];
      display?: LayoutConfigType['display'];
      style?: LayoutConfigType['style'];
    },
  ) {
    const lineID = getLineID(node.id, node2.id);

    const { block } = node;
    const { block: block2 } = node2;
    const isOutput = ItemTypeEnum.OUTPUT === node2?.type;

    const rect = new DOMRect(
      node?.rect?.left,
      node?.rect?.top,
      node?.rect?.width,
      node?.rect?.height,
    );
    const rect2 = new DOMRect(
      node2?.rect?.left,
      node2?.rect?.top,
      node2?.rect?.width,
      node2?.rect?.height,
    );

    DEBUG.lines.manager && console.log(node.id, node?.rect?.height, rect?.height);

    const colors = [];

    if (isOutput) {
      colors.push('greenmd');
    } else {
      [block, block2]?.forEach(b => {
        const color = getBlockColor((b as any)?.type ?? BlockTypeEnum.GROUP, { getColorName: true })
          ?.names?.base;

        if (
          (!color || colors.includes(color)) &&
          (BlockTypeEnum.GROUP === block2?.type || !block2?.type)
        ) {
          const groupsInLevel = groupsByLevelRef?.current?.[activeLevel?.current - 2];
          const { downstreamInGroup } = getUpDownstreamColors(
            block,
            groupsInLevel,
            blocksByGroupRef?.current,
          );
          colors.push(...(downstreamInGroup?.map(g => g.colorName) ?? []));
        } else if (color && !colors.includes(color)) {
          colors.push(color);
        }
      });
    }

    const fromRect = rect;
    const toRect = rect2;

    const positions = {
      [LayoutConfigDirectionEnum.VERTICAL]: ['bottom', 'top'],
      [LayoutConfigDirectionEnum.HORIZONTAL]: ['right', 'left'],
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

    const layoutConfig = layoutConfigs?.current?.[activeLevel?.current];
    const { direction, display, style } = {
      ...layoutConfig?.current,
      ...opts,
    };
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
    const paths = [];

    const { colors, dvalue, fromRect, isOutput, lineID, toRect } = prepareLinePathProps(
      node,
      node2,
      opts,
    );

    // console.log(lineID, fromRect?.left, fromRect?.top, toRect?.left, toRect?.top)

    const gradientID = `${lineID}-grad`;

    if (colors?.length >= 2) {
      paths.push(
        <defs key={`${gradientID}-defs`}>
          <linearGradient id={gradientID} x1='0%' x2='100%' y1='0%' y2='0%'>
            <stop offset='0%' style={{ stopColor: `var(--colors-${colors[1]})`, stopOpacity: 1 }} />
            <stop
              offset='100%'
              style={{ stopColor: `var(--colors-${colors[0]})`, stopOpacity: 1 }}
            />
          </linearGradient>
        </defs>,
      );
    }

    lineRefs.current[node2?.type] ||= {};
    lineRefs.current[node2?.type][lineID] ||= createRef();

    const lineRef = lineRefs.current[node2.type][lineID];

    if (lineRef?.current) {
      lineRef?.current?.classList?.remove(stylesBuilder.exit);
    }

    paths.push(
      <motion.path
        // {...animateProps}
        animate={controls}
        className={[LINE_CLASS_NAME].concat(nodeClassNames(node)).filter(Boolean).join(' ')}
        custom={{
          index,
          isOutput,
        }}
        d={dvalue}
        data-index={index}
        fill='none'
        id={lineID}
        key={lineID}
        onAnimationComplete={() => {
          if (lineRef?.current?.classList?.contains(stylesBuilder.exit)) {
            setLinesBlock(prev => ignoreKeys(prev, [node.id]));
            setLinesNode(prev => ignoreKeys(prev, [node.id]));
            setLinesOutput(prev => ignoreKeys(prev, [node.id]));
          }
        }}
        ref={r => {
          scope.current = r;
          lineRef.current = r;
        }}
        stroke={
          colors?.length >= 2 ? `url(#${gradientID})` : `var(--colors-${colors[0] ?? 'gray'})`
        }
        style={{
          strokeWidth: isOutput ? 2 : 1.5,
        }}
      />,
    );

    const keys = ['left', 'top', 'width', 'height'];

    // console.log(
    //   keys?.map(key => Math.round(fromRect?.[key])).map(String).join(':'),
    //   keys?.map(key => Math.round(toRect?.[key])).map(String).join(':'),
    // )

    return {
      id: lineID,
      key: [
        keys
          ?.map(key => Math.round(fromRect?.[key]))
          .map(String)
          .join(':'),
        keys
          ?.map(key => Math.round(toRect?.[key]))
          .map(String)
          .join(':'),
      ].join('->'),
      paths,
      source: node,
      target: node2,
    };
  }

  function handleLayoutChange(event: CustomAppEvent) {
    const { animate = false } = event?.detail?.options?.kwargs ?? {};

    updateLines(event);

    if (animate) {
      controls.stop();
      controls.set({
        opacity: 0,
        pathLength: 0,
      });

      clearTimeout(timeoutRef.current);

      const easing = cubicBezier(0.35, 0.17, 0.3, 0.86);
      timeoutRef.current = setTimeout(() => {
        const duration = 0.5;
        controls.set({
          opacity: 0,
          pathLength: 0,
        });
        controls.start(({ index, isOutput }) => ({
          ease: easing,
          opacity: 1,
          pathLength: 1,
          transition: {
            delay: index * duration + (isOutput ? 1 : 0.5),
            duration: isOutput ? 0.1 : duration * ((100 - index) / 100),
          },
        }));

        timeoutRef.current = null;
      }, 100);
    } else {
      controls.set({
        opacity: 1,
        pathLength: 1,
      });
    }
  }

  function handleOutputUpdated({ detail }: CustomAppEvent) {
    const { node, output } = detail;

    renderPaths({
      [ItemTypeEnum.OUTPUT]: [[node, output]],
    });
  }

  function linePathsForNode(node: NodeItemType, output?: OutputNodeType) {
    const arr = [];

    Object.entries(lineMappingRef.current).forEach(([type, mapping]) => {
      const lines = lineRefs.current?.[type];

      Object.values(mapping).forEach((linePaths: LinePathType[]) => {
        linePaths.forEach(linePath => {
          [node, output].filter(Boolean).forEach(item => {
            const { id: lineID, source, target } = linePath;

            if (![source.id, target.id].includes(item.id)) return;

            const lineRef = lines[lineID]?.current;
            if (!lineRef) return;

            // console.log(
            //   source.id,
            //   target.id,
            //   item.id,
            // );

            const { dvalue } = prepareLinePathProps(
              source.id === item.id ? item : source,
              target.id === item.id ? item : target,
            );
            arr.push({
              dvalue,
              linePath,
              lineRef,
            });
          });
        });
      });
    });

    return arr;
  }

  function handleDragging({ detail }: CustomAppEvent) {
    const { node, output } = detail;
    const linePaths = linePathsForNode(node, output);

    linePaths?.forEach(({ dvalue, lineRef }) => {
      lineRef?.setAttribute('d', dvalue);
    });
  }

  function handleNodeDismissed({ detail }) {
    const { node, output } = detail;
    const linePaths = linePathsForNode(node, output);
    linePaths?.forEach(({ lineRef }) => {
      lineRef?.classList.add(stylesBuilder.exit);
    });
  }

  useAppEventsHandler({ lineRefs } as any, {
    [CustomAppEventEnum.CLOSE_OUTPUT]: ({ detail: { node, output } }: CustomAppEvent) => {
      setLinesOutput(prev => ignoreKeys(prev, [getLineID(node.id, output.id)]));
    },
    [CustomAppEventEnum.NODE_DISPLAYED]: handleLayoutChange,
    [CustomAppEventEnum.NODE_DISMISSED]: handleNodeDismissed,
    [CustomAppEventEnum.NODE_DRAGGING]: handleDragging,
    [CustomAppEventEnum.NODE_LAYOUTS_CHANGED]: handleLayoutChange,
    [CustomAppEventEnum.OUTPUT_UPDATED]: handleOutputUpdated,
  });

  useEffect(() => {
    const timeout = timeoutRef.current;
    return () => timeout && clearTimeout(timeout);
  }, []);

  return (
    <div className={stylesBuilder.lineManager}>
      <ConnectionLines linePaths={linesBlock} zIndex={BASE_Z_INDEX + ORDER[ItemTypeEnum.BLOCK]} />
      <ConnectionLines linePaths={linesNode} zIndex={BASE_Z_INDEX + ORDER[ItemTypeEnum.NODE]} />
      <ConnectionLines linePaths={linesOutput} zIndex={BASE_Z_INDEX + ORDER[ItemTypeEnum.OUTPUT]} />
    </div>
  );
}
