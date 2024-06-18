import update from 'immutability-helper';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { BlockNode } from './BlockNode';
import { StatusTypeEnum, BlockTypeEnum } from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import { NodeWrapper, NodeWrapperProps } from './NodeWrapper';
import { getBlockColor } from '@mana/themes/blocks';
import { Check, Code, PipeIconVertical, PlayButtonFilled } from '@mana/icons';
import { randomSample } from '@utils/array';
import { createRef, useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { buildPortID, getNodeUUID } from '../Draggable/utils';
import { DraggablePort } from '../Draggable/DraggablePort';
import { getTransformedBoundingClientRect } from '../utils/rect';
import { connectionUUID } from '../Connections/utils';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import ReactDOM from 'react-dom';
import { DragItem, ConnectionType, LayoutConfigType, NodeItemType, PortType, RectType } from '../interfaces';

export function BlockNodeWrapper({
  item,
  items,
  frameworkGroups,
  onMountPort,
  onDragStart,
  onDrop,
  onMouseDown,
  onMouseUp,
  ...wrapperProps
}: NodeWrapperProps & {
  items: Record<string, DragItem>;
  onMountPort: (port: PortType, ref: React.RefObject<HTMLDivElement>) => void;
  frameworkGroups: Record<GroupUUIDEnum, Record<string, any>>;
  onDragStart: (item: NodeItemType, monitor: DragSourceMonitor) => void;
  onDrop: (dragTarget: NodeItemType, dropTarget: NodeItemType) => void;
  onMouseDown: (
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    obj: NodeItemType,
  ) => void;
  onMouseUp: (
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    obj: NodeItemType,
  ) => void;
}) {
  const itemRef = useRef(null);

  const portElementRefs = useRef<Record<string, any>>({});

  // function renderPort(port: PortType, child: React.ReactNode) {
  //   const uuid = getNodeUUID(port);
  //   const itemRef = portsRef?.current?.[uuid] ?? createRef<HTMLDivElement>();
  //   portsRef.current[uuid] = itemRef;

  //   return (
  //     <DraggablePort
  //       // handleMouseDown={event => handleMouseDown(event, port)}
  //       // handleMouseUp={event => handleMouseUp(event, port)}
  //       // handleOnDrop={handleOnDrop}
  //       // onDragStart={onDragStart}
  //       item={port}
  //       itemRef={itemRef}
  //       key={uuid}
  //       onMount={onPortMount}
  //     >
  //       {child}
  //     </DraggablePort>
  //   );
  // }

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
        .reduce((a, b) => typeCounts![a] > typeCounts![b] ? a : b) as BlockTypeEnum);
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

  const node = useMemo(() => (
    <BlockNode
      block={block}
      // Only use gradient borders when block selected
      borderConfig={{
        borders: borders?.slice(0, 1),
      }}
      groups={groups}
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
            Icon: PipeIconVertical,
            baseColorName: names?.base,
            label: name || uuid,
          }
          : undefined,
        label: name || uuid,
      }}
    />
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [block, borders, groups, names, name, type, uuid]);

  return (
    <NodeWrapper
      {...wrapperProps}
      item={item}
      itemRef={itemRef}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      {node}

      {/* {portsMemo} */}
    </NodeWrapper>
  );
}
