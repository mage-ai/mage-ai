import { NodeType, PortType, NodeItemType } from '../../../Canvas/interfaces';
import { PortSubtypeEnum, ItemTypeEnum } from '../../../Canvas/types';
import { buildPortIDFromBlockToBlock } from '../../../Canvas/Draggable/utils';
import { buildUUIDForLevel } from './levels';
import { selectKeys } from '@utils/hash';
import { indexBy } from '@utils/array';

export type PortsByItemType = Record<
  string,
  {
    item: NodeItemType;
    ports: PortType[];
  }
>;

export function createPortsByItem(
  items: NodeItemType[],
  opts?: { level?: number },
): PortsByItemType {
  const { level } = opts || {};
  const keys = ['downstream', 'id', 'type', 'upstream'];
  const itemsMapping = indexBy(items, ({ id }) => id);

  return items?.reduce((acc: PortsByItemType, item: NodeItemType) => {
    const { block, downstream, upstream } = item as NodeType;
    const props = {
      block,
      level,
      parent: selectKeys(item, keys),
      type: ItemTypeEnum.PORT,
    };

    const outputs: PortType[] =
      downstream?.map((blockID: string, index: number) => {
        const target = itemsMapping[blockID];

        return {
          ...props,
          id: buildUUIDForLevel(buildPortIDFromBlockToBlock(block, target?.block), level),
          index,
          subtype: PortSubtypeEnum.OUTPUT,
          target,
        };
      }) ?? [];

    const inputs: PortType[] =
      upstream?.map((blockID: string, index: number) => {
        const target = itemsMapping[blockID];

        return {
          ...props,
          id: buildUUIDForLevel(buildPortIDFromBlockToBlock(block, target?.block), level),
          index,
          subtype: PortSubtypeEnum.INPUT,
          target,
        };
      }) ?? [];

    return {
      ...acc,
      [item.id]: {
        item,
        ports: [...outputs, ...inputs],
      },
    };
  }, {});
}
