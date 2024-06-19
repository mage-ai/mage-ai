import { BlockNode } from './BlockNode';
import { StatusTypeEnum, BlockTypeEnum } from '@interfaces/BlockType';
import { NodeWrapper, NodeWrapperProps } from './NodeWrapper';
import { getBlockColor } from '@mana/themes/blocks';
import { Check, Code, PipeIconVertical, PlayButtonFilled, Infinite } from '@mana/icons';
import { createRef, useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { NodeItemType, PortType } from '../interfaces';

type BlockNodeWrapperProps = {
  collapsed?: boolean;
  onMountPort: (port: PortType, ref: React.RefObject<HTMLDivElement>) => void;
  frameworkGroups: Record<GroupUUIDEnum, Record<string, any>>;
};

export function BlockNodeWrapper({
  collapsed,
  frameworkGroups,
  item,
  handlers,
  onMountPort,
}: NodeWrapperProps & BlockNodeWrapperProps) {
  const itemRef = useRef(null);
  const portElementRefs = useRef<Record<string, any>>({});
  const [draggingNode, setDraggingNode] = useState<NodeItemType | null>(null);

  const { onMouseDown, onMouseUp } = handlers;

  function handleMouseDown(
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    node: NodeItemType,
  ) {
    onMouseDown(event, node);
    setDraggingNode(node);
  }

  function handleMouseUp(
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    node: NodeItemType,
  ) {
    onMouseUp(event, node);
    setDraggingNode(null);
  }

  function onMount(port: PortType, portRef: React.RefObject<HTMLDivElement>) {
    if (!(port?.id in portElementRefs.current)) {
      portElementRefs.current[port?.id] = {
        port,
        portRef,
      };
      onMountPort(port, portRef);
    }
  }

  const block = item?.block;
  const {
    name,
    pipeline,
    type,
    uuid,
  } = block;

  const groups = useMemo(() => block?.groups?.reduce((acc, group) => ({
    ...acc,
    [group]: frameworkGroups?.[group],
  }), {}), [block, frameworkGroups]);

  const names = useMemo(() => {
    if (BlockTypeEnum.PIPELINE === type) {
      const typeCounts = pipeline?.blocks?.reduce((acc: Record<string, number>, { type }) => {
        acc[type] = (acc[type] || 0) + 1;

        return acc;
      }, {});

      const modeType = (Object.keys(typeCounts || {})
        .reduce((a, b) => typeCounts?.[a] > typeCounts?.[b] ? a : b) as BlockTypeEnum);
      const colors = getBlockColor(modeType as BlockTypeEnum, { getColorName: true })?.names;
      return colors?.base ? colors : { base: 'gray' };
    }

    const c = getBlockColor(type as BlockTypeEnum, { getColorName: true });
    return c && c?.names ? c?.names : { base: 'gray' };
  }, [pipeline, type]);

  const ports = useMemo(() => (item?.inputs || []).concat(item?.outputs || []), [item]);

  const borders = useMemo(() => {
    const arr = [names?.base || ''];
    ports?.forEach(({ target }) => {
      const cn = getBlockColor(target?.block?.type as BlockTypeEnum, { getColorName: true })?.names?.base;
      if (!arr.includes(cn)) {
        arr.push(cn);
      }
    });

    return arr?.reduce((acc, c) => c ? acc.concat({ baseColorName: c }) : acc, []);
  }, [names, ports]);

  return (
    <NodeWrapper
      draggingNode={draggingNode}
      handlers={{
        ...handlers,
        onMouseDown: handleMouseDown,
        onMouseUp: handleMouseUp,
      }}
      item={item}
      itemRef={itemRef}
    >
      <BlockNode
        block={block}
        // Only use gradient borders when block selected
        borderConfig={{
          borders: borders?.slice(0, 1),
        }}
        groups={groups}
        handlers={{
          ...handlers,
          onMouseDown: handleMouseDown,
          onMouseUp: handleMouseUp,
        }}
        item={item}
        onMount={onMount}
        titleConfig={{
          asides: {
            after: {
              Icon: Code,
              onClick: () => alert('Coding...'),
            },
            before: {
              Icon: StatusTypeEnum.EXECUTED === block?.status ? Check : PlayButtonFilled,
              baseColorName: StatusTypeEnum.FAILED === block?.status
                ? 'red'
                : StatusTypeEnum.EXECUTED
                  ? 'green'
                  : 'blue',
            },
          },
          badge: BlockTypeEnum.PIPELINE === type
            ? {
              Icon: collapsed ? Infinite : PipeIconVertical,
              baseColorName: names?.base,
              label: name || uuid,
            }
            : undefined,
          label: name || uuid,
        }}
      />
    </NodeWrapper>
  );
}
