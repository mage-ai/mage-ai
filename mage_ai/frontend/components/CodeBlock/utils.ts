import BlockType, {
  BLOCK_TYPE_NAME_MAPPING,
  BLOCK_TYPES_WITH_NO_PARENTS,
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  CONVERTIBLE_BLOCK_TYPES,
  TagEnum,
} from '@interfaces/BlockType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { capitalizeRemoveUnderscoreLower, lowercase } from '@utils/string';
import { goToWithQuery } from '@utils/routing';
import { ViewKeyEnum } from '@components/Sidekick/constants';

export const getUpstreamBlockUuids = (
  currentBlock: BlockType,
  newBlock?: BlockRequestPayloadType,
): string[] => {
  const upstreamBlocks = newBlock?.upstream_blocks || [];

  if (!BLOCK_TYPES_WITH_NO_PARENTS.includes(currentBlock?.type)
    && !BLOCK_TYPES_WITH_NO_PARENTS.includes(newBlock?.type)
    && (
      BlockTypeEnum.DATA_LOADER !== newBlock?.type
        || BlockTypeEnum.SENSOR === currentBlock.type
    )
  ) {
    upstreamBlocks.push(currentBlock.uuid);
  }

  return upstreamBlocks;
};

export const getDownstreamBlockUuids = (
  pipeline: PipelineType,
  currentBlock: BlockType,
  newBlock?: BlockRequestPayloadType,
): string[] => {
  let downstreamBlocks = [];

  if (pipeline?.type === PipelineTypeEnum.STREAMING
    && !BLOCK_TYPES_WITH_NO_PARENTS.includes(currentBlock?.type)
    && !BLOCK_TYPES_WITH_NO_PARENTS.includes(newBlock?.type)
  ) {
    downstreamBlocks = downstreamBlocks.concat(currentBlock?.downstream_blocks || []);
  }

  return downstreamBlocks;
};

export const buildConvertBlockMenuItems = (
  b: BlockType,
  blocks: BlockType[],
  baseUUID: string,
  addNewBlock: (block: BlockRequestPayloadType) => Promise<any>,
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
        converted_from_type: blockType,
        converted_from_uuid: b.uuid,
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
    runSettings?: {
      build_model?: boolean;
      run_model?: boolean;
      test_model?: boolean;
    };
    runTests?: boolean;
    runUpstream?: boolean;
  }) => void,
  deleteBlock: (block: BlockType) => void,
  setOutputCollapsed: (outputCollapsed: boolean) => void,
  onlyIncludeDeleteBlock?: boolean,
  opts?: {
    addNewBlock?: (block: BlockRequestPayloadType) => Promise<any>,
    blocksMapping: {
      [uuid: string]: BlockType;
    };
    fetchFileTree: () => void;
    fetchPipeline: () => void;
    savePipelineContent: (payload?: {
      block?: BlockType;
      pipeline?: PipelineType;
    }) => Promise<any>;
    updatePipeline: (payload: {
      pipeline: {
        add_upstream_for_block_uuid: string;
      };
    }) => Promise<any>;
  },
): FlyoutMenuItemType[] => {
  const {
    configuration,
    downstream_blocks: downstreamBlocks,
    has_callback,
    language,
    metadata,
    replicated_block: replicatedBlock,
    type: blockType,
    upstream_blocks: upstreamBlocks,
    uuid: blockUUID,
  } = block || {};
  const {
    dynamic,
    reduce_output: reduceOutput,
  } = configuration || {};
  const isDBT = BlockTypeEnum.DBT === blockType;
  const items: FlyoutMenuItemType[] = [];

  if (![
    BlockTypeEnum.CALLBACK,
    BlockTypeEnum.EXTENSION,
    BlockTypeEnum.MARKDOWN,
  ].includes(blockType)) {
    items.push({
      label: () => isDBT
        ? 'Execute and run upstream blocks'
        : 'Execute with upstream blocks',
      onClick: () => runBlock({ block, runUpstream: true }),
      uuid: 'execute_upstream',
    });

    if (!isDBT) {
      items.push({
        label: () => 'Execute block and run tests',
        onClick: () => runBlock({ block, runTests: true }),
        uuid: 'run_tests',
      });
    }

    const {
      addNewBlock,
      blocksMapping,
      fetchFileTree,
      fetchPipeline,
      savePipelineContent,
      updatePipeline,
    } = opts || {};

    // If current block’s downstream has other dynamic blocks,
    // disable this button
    const otherDynamicBlocks = [];
    downstreamBlocks.forEach((uuid1: string) => {
      const b = blocksMapping?.[uuid1];
      if (b) {
        b.upstream_blocks.forEach((uuid2: string) => {
          if (blocksMapping?.[uuid2]?.configuration?.dynamic) {
            otherDynamicBlocks.push(blocksMapping[uuid2]);
          }
        });
      }
    });

    if (isDBT && BlockLanguageEnum.SQL === language) {
      if (!metadata?.dbt?.block?.snapshot) {
        items.unshift(...[
          {
            label: () => 'Run model',
            onClick: () => runBlock({
              block,
              runSettings: {
                run_model: true,
              },
            }),
            tooltip: () => 'Execute command dbt run.',
            uuid: 'run_model',
          },
          {
            label: () => 'Test model',
            onClick: () => runBlock({
              block,
              runSettings: {
                test_model: true,
              },
            }),
            tooltip: () => 'Execute command dbt test.',
            uuid: 'test_model',
          },
          {
            label: () => 'Build model',
            onClick: () => runBlock({
              block,
              runSettings: {
                build_model: true,
              },
            }),
            tooltip: () => 'Execute command dbt build.',
            uuid: 'build_model',
          },
          {
            label: () => 'Add upstream models',
            onClick: () => {
              updatePipeline({
                pipeline: {
                  add_upstream_for_block_uuid: block?.uuid,
                },
              });
            },
            tooltip: () => 'Add upstream models for this model to the pipeline.',
            uuid: 'add_upstream_models',
          },
        ]);
      }
    }

    if (!isDBT && savePipelineContent && (dynamic || otherDynamicBlocks.length === 0)) {
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
                reduce_output: !reduceOutput,
              },
            },
          }),
          uuid: 'reduce_output',
        });
      }
    }

    items.push({
      label: () => has_callback ? 'Remove callback' : 'Add callback',
      onClick: () => {
        if (has_callback) {
          return savePipelineContent({
            block: {
              ...block,
              has_callback: !has_callback,
            },
          }).then(() => {
            fetchFileTree();
            fetchPipeline();
          });
        } else {
          goToWithQuery({
            sideview: ViewKeyEnum.CALLBACKS,
          });
        }
      },
      uuid: 'has_callback',
    });


    if (!isDBT) {
      items.push({
        disabled: !!replicatedBlock,
        label: () => 'Replicate block',
        onClick: () => addNewBlock({
          replicated_block: blockUUID,
        }),
        uuid: 'Replicate block',
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

  if (onlyIncludeDeleteBlock) {
    return [items.pop()];
  }

  return items;
};

export function buildTags({ tags }: BlockType): {
  description?: string;
  title: string;
}[] {
  const arr = [];

  tags?.forEach((tag: TagEnum) => {
    if (TagEnum.DBT_SNAPSHOT === tag) {
      arr.push({
        description: 'This is a dbt snapshot file.',
        title: capitalizeRemoveUnderscoreLower(TagEnum.DBT_SNAPSHOT),
      });
    } else if (TagEnum.DYNAMIC === tag) {
      arr.push({
        description: 'This block will create N blocks for each of its downstream blocks.',
        title: capitalizeRemoveUnderscoreLower(TagEnum.DYNAMIC),
      });
    } else if (TagEnum.DYNAMIC_CHILD === tag) {
      arr.push({
        description: 'This block is dynamically created by its upstream parent block that is dynamic.',
        title: capitalizeRemoveUnderscoreLower(TagEnum.DYNAMIC_CHILD),
      });
    } else if (TagEnum.REDUCE_OUTPUT === tag) {
      arr.push({
        description: 'Reduce output from all dynamically created blocks into a single array output.',
        title: capitalizeRemoveUnderscoreLower(TagEnum.REDUCE_OUTPUT),
      });
    } else if (TagEnum.REPLICA === tag) {
      arr.push({
        description: 'This block is a replica of another block in the current pipeline.',
        title: capitalizeRemoveUnderscoreLower(TagEnum.REPLICA),
      });
    } else {
      arr.push({
        title: tag,
      });
    }
  });

  return arr;
}

export function buildBorderProps({
  block,
  dynamic,
  dynamicUpstreamBlock,
  hasError,
  reduceOutput,
  reduceOutputUpstreamBlock,
  selected,
}) {
  const dynamicChildBlock = dynamicUpstreamBlock && !reduceOutputUpstreamBlock;

  return {
    borderColorShareProps: {
      blockColor: block?.color,
      blockType: block?.type,
      dynamicBlock: dynamic,
      dynamicChildBlock,
      hasError,
      selected,
    },
    tags: buildTags(block),
  };
}
