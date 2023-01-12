import { useMemo } from 'react';

import BlockType from '@interfaces/BlockType';
import { indexBy } from '@utils/array';

export function getLeafNodes(
  block: BlockType,
  attributeKey: string,
  blocks: BlockType[],
  opts: {
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

    const arr: BlockType[] = (blockInner[attributeKey] || [])
      .reduce((acc, uuid: string) => {
        if (block.uuid === uuid) {
          return acc;
        }

        return acc.concat(blocksMapping[uuid]);
      }, []);
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

function getUpstreamDynamicAndReduceOuput(block: BlockType, blocks: BlockType[]): {
  dynamicUpstreamBlock?: BlockType;
  reduceOutputUpstreamBlock?: BlockType;
} {
  const ancestors = getAllAncestors(block, blocks);
  const dynamicUpstreamBlock = ancestors.find(({
    configuration,
    uuid,
  }) => configuration?.dynamic && uuid !== block?.uuid);
  const reduceOutputUpstreamBlock = ancestors.find(({
    configuration,
    uuid,
  }) => configuration?.reduce_output && uuid !== block?.uuid);

  return {
    dynamicUpstreamBlock,
    reduceOutputUpstreamBlock,
  };
}

export function useDynamicUpstreamBlocks(blocksToUse: BlockType[], blocks: BlockType[]): {
  block: BlockType,
  dynamic: boolean;
  dynamicUpstreamBlock?: BlockType;
  reduceOutput: boolean;
  reduceOutputUpstreamBlock?: BlockType;
}[] {
  return useMemo(() => blocksToUse.map((block: BlockType) => {
    const {
      dynamicUpstreamBlock,
      reduceOutputUpstreamBlock,
    } = getUpstreamDynamicAndReduceOuput(block, blocks);

    const {
      configuration
    } = block || {};
    const {
      dynamic,
      reduce_output: reduceOutput,
    } = configuration || {};

    return {
      block,
      dynamic: !!dynamic,
      dynamicUpstreamBlock,
      reduceOutput: !!reduceOutput,
      reduceOutputUpstreamBlock,
    };
  }), [
    blocks,
    blocks?.map(({ configuration }) => configuration?.dynamic),
    blocks?.map(({ configuration }) => configuration?.reduce_output),
    blocks?.map(({ upstream_blocks: ub }) => ub),
  ]);
}
