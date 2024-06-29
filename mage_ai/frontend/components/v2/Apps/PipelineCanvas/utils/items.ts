import BlockType from '@interfaces/BlockType';
import { BlockGroupType, NodeItemType } from '../../../Canvas/interfaces';
import { ItemTypeEnum } from '../../../Canvas/types';
import { buildUUIDForLevel } from './levels';
import { selectKeys } from '@utils/hash';

export function createItemsFromBlockGroups(
  blockGroups: BlockGroupType[],
  opts?: { level?: number },
): {
  items: NodeItemType[];
  nodes: NodeItemType[];
} {
  const nodes = [];
  const items = [];

  blockGroups.forEach((blockGroup: BlockGroupType) => {
    const { blocks, group } = blockGroup;
    const items2 = createItemsFromBlocks(blocks, opts);

    const node = {
      ...buildItemFromBlock(group as BlockType, opts),
      items: items2.map(item => ({
        id: item.id,
      })),
      type: ItemTypeEnum.NODE,
    };
    nodes.push(node);

    items2.forEach((item: NodeItemType) => {
      items.push({
        ...item,
        node: selectKeys(node, ['downstream', 'id', 'items', 'upstream']),
      });
    });
  });

  const itemsByNodeID = {}
  items?.forEach((item: NodeItemType) => {
    if (ItemTypeEnum.NODE !== item?.type && item?.node) {
      itemsByNodeID[item?.node?.id] ||= [];
      itemsByNodeID[item?.node?.id].push(item?.id)
    }
  });

  nodes?.forEach((node: NodeItemType) => {
    node.items = itemsByNodeID[node?.id] ?? [];
  });


  return {
    items,
    nodes,
  };
}

function buildItemFromBlock(block: BlockType, opts?: {
  level?: number;
}): NodeItemType {
  const { level } = opts || {};

  return {
    block: block as any,
    downstream: (block?.downstream_blocks)?.map(uuid => buildUUIDForLevel(uuid, level)) ?? [],
    id: buildUUIDForLevel(block.uuid, level),
    level,
    rect: null,
    title: block.name || block.uuid,
    type: ItemTypeEnum.BLOCK,
    upstream: (block?.upstream_blocks)?.map(uuid => buildUUIDForLevel(uuid, level)) ?? [],
  };
}

function createItemsFromBlocks(blocks: BlockType[], opts?: {
  level?: number;
}): NodeItemType[] {
  return blocks.map(block => buildItemFromBlock(block, opts));
}
