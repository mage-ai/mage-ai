import BlockType from '@interfaces/BlockType';
import { indexBy } from '@utils/array';

export function getLeafNodes(
  block: BlockType,
  attributeKey: string,
  blocks: BlockType[],
  opts?: {
    includeAllNodes: boolean;
  } = {
    includeAllNodes: false,
  },
): BlockType[] {
  const blocksMapping = indexBy(blocks, ({ uuid }) => uuid);

  const {
    includeAllNodes,
  } = opts || {};
  const leafs: BlockType[] = [];

  function _getLeafNodes(blockInner: BlockType) {
    if (!blockInner) {
      return;
    }

    const arr: BlockType[] = (blockInner[attributeKey] || []).map((uuid: string) => blocksMapping[uuid]);
    if (arr.length === 0 || (includeAllNodes && block.uuid !== blockInner.uuid)) {
      leafs.push(blockInner);
    }

    arr.forEach((block3: BlockType) => {
      _getLeafNodes(block3);
    });
  }

  _getLeafNodes(block);

  return leafs;
}

export function getAllAncestors(block: BlockType, blocks: BlockType[]): BlockType[] {
  return getLeafNodes(block, 'upstream_blocks', blocks, {
    includeAllNodes: true,
  });
}
