import BlockType from '@interfaces/BlockType';
import { BlockGroupType, NodeType, OutputNodeType, RectType } from '../../../Canvas/interfaces';
import { ItemTypeEnum } from '../../../Canvas/types';
import { buildUUIDForLevel } from './levels';
import { hashCode } from '@utils/string';
import { selectKeys } from '@utils/hash';

export function createItemsFromBlockGroups(
  blockGroups: BlockGroupType[],
  opts?: { level?: number },
): {
  items: NodeType[];
  nodes: NodeType[];
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

    items2.forEach((item: NodeType) => {
      items.push({
        ...item,
        node: selectKeys(node, ['downstream', 'id', 'items', 'upstream']),
      });
    });
  });

  const itemsByNodeID: Record<string, string[]> = {};
  items?.forEach((item: NodeType) => {
    if (ItemTypeEnum.NODE !== item?.type && item?.node) {
      itemsByNodeID[item?.node?.id] ||= [];
      itemsByNodeID[item?.node?.id].push(String(item?.id));
    }
  });

  nodes?.forEach((node: NodeType) => {
    node.items = itemsByNodeID[node?.id] ?? [];
  });

  return {
    items,
    nodes,
  };
}

function buildItemFromBlock(
  block: BlockType,
  opts?: {
    level?: number;
  },
): NodeType {
  const { level } = opts || {};

  return {
    block: block as any,
    downstream: block?.downstream_blocks?.map(uuid => buildUUIDForLevel(uuid, level)) ?? [],
    id: buildUUIDForLevel(block.uuid, level),
    level,
    rect: null,
    title: block.name || block.uuid,
    type: ItemTypeEnum.BLOCK,
    upstream: block?.upstream_blocks?.map(uuid => buildUUIDForLevel(uuid, level)) ?? [],
  };
}

function createItemsFromBlocks(
  blocks: BlockType[],
  opts?: {
    level?: number;
  },
): NodeType[] {
  return blocks.map(block => buildItemFromBlock(block, opts));
}

export function buildOutputNode(
  node: NodeType,
  block: BlockType,
  process?: {
    message?: string;
    message_request_uuid?: string;
    uuid: string;
  },
): OutputNodeType {
  const id = [node.id, 'output', process.uuid].filter(Boolean).join(':');
  const { level, rect, status } = node ?? {};

  const outputRect = {
    parent: rect,
  } as RectType;
  if (rect) {
    outputRect.height = rect.height ?? 0;
    outputRect.left = rect.left ?? 0;
    outputRect.top = rect.top ?? 0;
    outputRect.width = (rect.width ?? 0) * 1.5;
  }

  const output = {
    block: null,
    id,
    level,
    node: {
      id: node?.id,
    } as any,
    process: process as any,
    rect: outputRect,
    status,
    type: ItemTypeEnum.OUTPUT,
    upstream: [String(node.id)],
  } as OutputNodeType;

  if (block) {
    output.block = block as any;
  }

  return output;
}
