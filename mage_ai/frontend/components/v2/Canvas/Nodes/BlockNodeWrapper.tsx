import { BlockNode } from './BlockNode';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { NodeWrapper, NodeWrapperProps } from './NodeWrapper';
import { getBlockColor } from '@mana/themes/blocks';
import { Check, Pipeline, PlayButtonFilled } from '@mana/icons';
import { randomSample } from '@utils/array';
import { useMemo } from 'react';
import { DragItem } from '../interfaces';

export function BlockNodeWrapper({ items, ...wrapperProps }: NodeWrapperProps & {
  items: Record<string, DragItem>;
}) {
  const block = wrapperProps?.item?.block;

  const {
    name,
    type,
    uuid,
  } = block;

  console.log(block);

  const {
    names,
  } = getBlockColor(type as BlockTypeEnum, { getColorName: true });

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
        borderConfig={{
          borders,
        }}
        titleConfig={{
          asides: {
            before: {
              Icon: randomSample([Check, PlayButtonFilled]),
              baseColorName: randomSample(['blue', 'green', 'red']),
            },
          },
          badge: {
            Icon: Pipeline,
            baseColorName: names?.base,
            label: name || uuid,
          },
          inputConnection: connections?.find(({ toItem }) => toItem?.uuid === block?.uuid),
          label: name || uuid,
          outputConnection: connections?.find(({ fromItem }) => fromItem?.uuid === block?.uuid),
        }}
      />
    </NodeWrapper>
  );
}
