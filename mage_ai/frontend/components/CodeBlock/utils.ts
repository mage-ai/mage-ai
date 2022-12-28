import BlockType, {
  BLOCK_TYPE_NAME_MAPPING,
  BlockRequestPayloadType,
  BlockTypeEnum,
  CONVERTIBLE_BLOCK_TYPES,
} from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { lowercase } from '@utils/string';

export const getUpstreamBlockUuids = (
  currentBlock: BlockType,
  newBlock?: BlockRequestPayloadType,
): string[] => {
  const upstreamBlocks = newBlock?.upstream_blocks || [];

  if (BlockTypeEnum.CHART !== currentBlock.type
    && BlockTypeEnum.SCRATCHPAD !== currentBlock.type
    && BlockTypeEnum.CHART !== newBlock?.type
    && BlockTypeEnum.SCRATCHPAD !== newBlock?.type
    && (
      BlockTypeEnum.DATA_LOADER !== newBlock?.type
        || BlockTypeEnum.SENSOR === currentBlock.type
    )
  ) {
    upstreamBlocks.push(currentBlock.uuid);
  }

  return upstreamBlocks;
};

export const buildConvertBlockMenuItems = (
  b: BlockType,
  blocks: BlockType[],
  baseUUID: string,
  addNewBlock: (block: BlockType) => Promise<any>,
): FlyoutMenuItemType[] => {
  const upstreamBlocks = [];
  let currentIndex = blocks.findIndex(({ uuid }) => uuid === b.uuid);

  let previousBlock;
  while (!previousBlock && currentIndex >= 0) {
    previousBlock = blocks[currentIndex - 1];
    if (BlockTypeEnum.SCRATCHPAD === previousBlock?.type) {
      previousBlock = null;
    }
    currentIndex -= 1;
  }

  if (previousBlock) {
    upstreamBlocks.push(previousBlock.uuid);
  }

  return (
    CONVERTIBLE_BLOCK_TYPES.map(blockType => ({
      label: () => `Convert to ${lowercase(BLOCK_TYPE_NAME_MAPPING[blockType])}`,
      // @ts-ignore
      onClick: () => addNewBlock({
        converted_from: b.uuid,
        type: blockType,
        upstream_blocks: upstreamBlocks,
      }),
      uuid: `${baseUUID}/convert_to/${blockType}`,
    }))
  );
};

export const getMoreActionsItems = (
  block: BlockType,
  runBlock: (payload: {
    block: BlockType;
    runTests?: boolean;
    runUpstream?: boolean;
  }) => void,
  deleteBlock: (block: BlockType) => void,
  setOutputCollapsed: (outputCollapsed: boolean) => void,
  isStreamingPipeline: boolean,
  opts?: {
    blocksMapping: {
      [uuid: string]: BlockType;
    };
    savePipelineContent: (payload?: {
      block?: BlockType;
      pipeline?: PipelineType;
    }) => Promise<any>;
  },
): FlyoutMenuItemType[] => {
  const items: FlyoutMenuItemType[] = [
    {
      label: () => 'Execute with upstream blocks',
      onClick: () => runBlock({ block, runUpstream: true }),
      uuid: 'execute_upstream',
    },
    {
      label: () => 'Execute block and run tests',
      onClick: () => runBlock({ block, runTests: true }),
      uuid: 'run_tests',
    },
  ];

  const {
    configuration,
    upstream_blocks: upstreamBlocks,
  } = block || {};
  const {
    dynamic,
    reduce_output: reduceOutput,
  } = configuration || {};

  const {
    blocksMapping,
    savePipelineContent,
  } = opts || {};

  if (savePipelineContent) {
    items.push({
      label: () => dynamic ? 'Disable block as dynamic' : 'Set block as dynamic',
      onClick: () => savePipelineContent({
        block: {
          ...block,
          configuration: {
            ...configuration,
            dynamic: !dynamic,
          },
        },
      }),
      uuid: 'dynamic',
    });
  }

  if (blocksMapping) {
    const dynamicChildBlock = upstreamBlocks?.find(
      (uuid: string) => blocksMapping?.[uuid]?.configuration?.dynamic,
    );

    if (dynamicChildBlock) {
      items.push({
        label: () => reduceOutput ? 'Don’t reduce output' : 'Reduce output',
        onClick: () => savePipelineContent({
          block: {
            ...block,
            configuration: {
              ...configuration,
              dynamic: !reduceOutput,
            },
          },
        }),
        uuid: 'reduce_output',
      });
    }
  }

  items.push({
    label: () => 'Delete block',
    onClick: () => {
      deleteBlock(block);
      setOutputCollapsed(false);
    },
    uuid: 'delete_block',
  });

  if (isStreamingPipeline) {
    return [items.pop()];
  }

  return items;
};
