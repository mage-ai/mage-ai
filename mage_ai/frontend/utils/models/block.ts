import { useMemo } from 'react';

import BlockType, { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import { StreamType } from '@interfaces/IntegrationSourceType';
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
  dynamicUpstreamBlocks: BlockType[];
  reduceOutputUpstreamBlock?: BlockType;
  reduceOutputUpstreamBlocks: BlockType[];
} {
  const ancestors = getAllAncestors(block, blocks);
  const dynamicUpstreamBlocks = ancestors.filter(({
    configuration,
    uuid,
  }) => configuration?.dynamic && uuid !== block?.uuid);
  const reduceOutputUpstreamBlocks = ancestors.filter(({
    configuration,
    uuid,
  }) => configuration?.reduce_output && uuid !== block?.uuid);

  return {
    dynamicUpstreamBlock: dynamicUpstreamBlocks[0],
    dynamicUpstreamBlocks,
    reduceOutputUpstreamBlock: reduceOutputUpstreamBlocks[0],
    reduceOutputUpstreamBlocks,
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
      dynamicUpstreamBlocks,
      reduceOutputUpstreamBlock,
      reduceOutputUpstreamBlocks,
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
      blocksToUse,
      dynamic: !!dynamic,
      dynamicUpstreamBlock,
      dynamicUpstreamBlocks,
      reduceOutput: !!reduceOutput,
      reduceOutputUpstreamBlock,
      reduceOutputUpstreamBlocks,
    };
  }), [
    blocks,
    blocks?.map(({ configuration }) => configuration?.dynamic),
    blocks?.map(({ configuration }) => configuration?.reduce_output),
    blocks?.map(({ upstream_blocks: ub }) => ub),
  ]);
}

export function isDataIntegrationBlock(block: BlockType, pipeline: PipelineType = null) {
  const {
    configuration,
    language,
    type: blockType,
  } = block || {};
  const {
    data_integration: dataIntegration,
  } = configuration || {};

  const isCorrectBlockType = [
    BlockTypeEnum.DATA_LOADER,
    BlockTypeEnum.DATA_EXPORTER,
  ].includes(blockType);

  if (PipelineTypeEnum.PYTHON === pipeline?.type && isCorrectBlockType) {
    if (BlockLanguageEnum.YAML === language) {
      return true;
    }

    if (BlockLanguageEnum.PYTHON === language && dataIntegration) {
      return true;
    }
  }

  return false;
}

export function isStreamSelected(stream: StreamType) {
  const {
    metadata,
  } = stream || {};

  return metadata?.find(({ breadcrumb }) => breadcrumb?.length === 0)?.metadata?.selected;
}

export function getSelectedStreams(block: BlockType, opts?: {
  getAll?: boolean;
}): StreamType[] {
  const {
    getAll,
  } = opts || {};

  const catalog = block?.catalog;

  const arr = catalog?.streams || [];

  if (getAll) {
    return arr;
  }

  return arr?.filter(isStreamSelected);
}
