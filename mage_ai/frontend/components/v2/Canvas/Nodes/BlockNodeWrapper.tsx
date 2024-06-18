import { BlockNode } from './BlockNode';
import { BlockTypeEnum } from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import { NodeWrapper, NodeWrapperProps } from './NodeWrapper';
import { getBlockColor } from '@mana/themes/blocks';
import { Check, Code, PipeIconVertical, PlayButtonFilled } from '@mana/icons';
import { randomSample } from '@utils/array';
import { useMemo } from 'react';
import { DragItem } from '../interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';

export function BlockNodeWrapper({
  items,
  frameworkGroups,
  ...wrapperProps
}: NodeWrapperProps & {
  items: Record<string, DragItem>;
  frameworkGroups: Record<GroupUUIDEnum, PipelineType>;
}) {
  const block = wrapperProps?.item?.block;

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

  return (
    <NodeWrapper {...wrapperProps}>
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
              Icon: randomSample([Check, PlayButtonFilled]),
              baseColorName: randomSample(['blue', 'green', 'red']),
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
    </NodeWrapper>
  );
}
