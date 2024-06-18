import { BlockNode } from './BlockNode';
import { BlockTypeEnum } from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import { NodeWrapper, NodeWrapperProps } from './NodeWrapper';
import { getBlockColor } from '@mana/themes/blocks';
import { Check, Code, PipeIconVertical, PlayButtonFilled } from '@mana/icons';
import { randomSample } from '@utils/array';
import { createRef, useCallback, useMemo, useRef } from 'react';
import { DragItem, PortType } from '../interfaces';
import { buildPortID, getNodeUUID } from '../Draggable/utils';
import { DraggablePort } from '../Draggable/DraggablePort';
import { GroupUUIDEnum, PortSubtypeEnum } from '@interfaces/PipelineExecutionFramework/types';

export function BlockNodeWrapper({
  item,
  items,
  frameworkGroups,
  onPortMount,
  ...wrapperProps
}: NodeWrapperProps & {
  items: Record<string, DragItem>;
  frameworkGroups: Record<GroupUUIDEnum, PipelineType>;
}) {
  const portsRef = useRef({});
  function renderPort(port: PortType, child: React.ReactNode) {
    const uuid = getNodeUUID(port);
    const itemRef = portsRef?.current?.[uuid] ?? createRef<HTMLDivElement>();
    portsRef.current[uuid] = itemRef;

    return (
      <DraggablePort
        // handleMouseDown={event => handleMouseDown(event, port)}
        // handleMouseUp={event => handleMouseUp(event, port)}
        // handleOnDrop={handleOnDrop}
        item={port}
        itemRef={itemRef}
        key={uuid}
        // onDragStart={onDragStart}
        onMount={onPortMount}
      >
        {child}
      </DraggablePort>
    );
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

      const modeType = (Object.keys(typeCounts || {}).reduce((a, b) => typeCounts![a] > typeCounts![b] ? a : b) as BlockTypeEnum);
      const colors = getBlockColor(modeType as BlockTypeEnum, { getColorName: true })?.names;
      return colors?.base ? colors : { base: 'gray' };
    }

    const c = getBlockColor(type as BlockTypeEnum, { getColorName: true });
    return c && c?.names ? c?.names : { base: 'gray' };
  }, [pipeline, type]);

  const connections = useMemo(() => {
    const arr = [];

    block?.downstream_blocks?.forEach((uuidB: string) => {
      const toItem = items?.[uuidB]?.block;
      const port = item?.outputs?.find(({ id }) => id === buildPortID(block?.uuid, uuidB));

      arr.push({
        fromItem: block,
        toItem,
        toPort: {
          port,
          render: (element: React.ReactNode) => renderPort(port, element),
        },
      });
    });

    block?.upstream_blocks?.forEach((uuidB: string) => {
      const fromItem = items?.[uuidB]?.block;
      const port = item?.inputs?.find(({ id }) => id === buildPortID(block?.uuid, uuidB));
      arr.push({
        fromItem,
        fromPort: {
          port,
          render: (element: React.ReactNode) => renderPort(port, element),
        },
        toItem: block,
      });
    });

    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, item, items]);

  const borders = useMemo(() => {
    const arr = [names?.base];

    connections?.forEach(({ fromItem, toItem }) => {
      const colors1 = getBlockColor(fromItem?.type as BlockTypeEnum, { getColorName: true });
      const colors2 = getBlockColor(toItem?.type as BlockTypeEnum, { getColorName: true });
      [colors1, colors2]?.forEach((colors) => {
        const val = colors?.names?.base;
        if (!arr.includes(val)) {
          arr.push(val);
        }
      });
    });

    return arr?.reduce((acc, c) => c ? acc.concat({ baseColorName: c }) : acc, []);
  }, [connections, names]);

  const node = useMemo(() => (
    <BlockNode
      block={block}
      borderConfig={{
        borders,
      }}
      connections={connections}
      groups={groups}
      titleConfig={{
        asides: {
          after: {
            Icon: Code,
            onClick: () => alert('Coding...'),
          },
          before: {
            // Icon: randomSample([Check, PlayButtonFilled]),
            Icon: PlayButtonFilled,
            baseColorName: 'blue' || randomSample(['blue', 'green', 'red']),
          },
        },
        badge: BlockTypeEnum.PIPELINE === type
          ? {
            Icon: PipeIconVertical,
            baseColorName: names?.base,
            label: name || uuid,
          }
          : undefined,
        inputConnection: connections?.find(({ toItem }) => toItem?.uuid === block?.uuid),
        label: name || uuid,
        outputConnection: connections?.find(({ fromItem }) => fromItem?.uuid === block?.uuid),
      }}
    />
  ), [block, borders, connections, groups, names, name, type, uuid]);

  return (
    <NodeWrapper
      {...wrapperProps}
      item={item}
    >
      {node}
    </NodeWrapper>
  );
}
