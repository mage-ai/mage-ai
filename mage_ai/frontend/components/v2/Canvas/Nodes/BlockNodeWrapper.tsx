import { BlockNode } from './BlockNode';
import { BlockTypeEnum } from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import { NodeWrapper, NodeWrapperProps } from './NodeWrapper';
import { getBlockColor } from '@mana/themes/blocks';
import { Check, Code, PipeIconVertical, PlayButtonFilled } from '@mana/icons';
import { randomSample } from '@utils/array';
import { createRef, useCallback, useMemo, useRef } from 'react';
import { DragItem, PortType } from '../interfaces';
import { getNodeUUID } from '../Draggable/utils';
import { DraggablePort } from '../Draggable/DraggablePort';
import { GroupUUIDEnum,PortSubtypeEnum } from '@interfaces/PipelineExecutionFramework/types';

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
  const ports: PortType[] = useMemo(
    () => ((item?.inputs || []) as PortType[]).concat((item?.outputs || []) as PortType[]),
    [item],
  );

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
      arr.push({
        fromItem: block,
        toItem: items?.[uuidB]?.block,
      });
    });
    block?.upstream_blocks?.forEach((uuidB: string) => {
      arr.push({
        fromItem: items?.[uuidB]?.block,
        toItem: block,
      });
    });

    return arr;
  }, [block, items]);

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

  const renderPorts = useCallback((portsArr: PortType[]) => portsArr?.map((port: PortType) => {
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
      />
    );
  }), [onPortMount]);

  const portsInput = useMemo(() => renderPorts(ports?.filter(({ parent }) => parent?.id === item?.id)), [item, ports, renderPorts]);
  const portsOutput = useMemo(() => renderPorts(ports?.filter(({ parent }) => parent?.id !== item?.id)), [item, ports, renderPorts]);

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
      {portsInput}
      {node}
      {portsOutput}
    </NodeWrapper>
  );
}
