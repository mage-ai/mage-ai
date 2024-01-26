import BlockType, {
  BLOCK_TYPE_NAME_MAPPING,
  BLOCK_TYPES_WITH_NO_PARENTS,
  BlockColorEnum,
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  CONVERTIBLE_BLOCK_TYPES,
  TagEnum,
} from '@interfaces/BlockType';
import KernelOutputType, {
  DataTypeEnum,
  ExecutionStateEnum,
} from '@interfaces/KernelOutputType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import { AddonBlockTypeEnum } from '@interfaces/AddonBlockOptionType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { capitalizeRemoveUnderscoreLower, lowercase } from '@utils/string';
import { getColorsForBlockType } from './index.style';
import { goToWithQuery } from '@utils/routing';

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
    runIncompleteUpstream?: boolean;
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
    fetchFileTree?: () => void;
    fetchPipeline: () => void;
    openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
      addon: AddonBlockTypeEnum,
      blockUUID: string;
    }) => void;
    project?: ProjectType;
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

  const isInteractionsEnabled = !!opts?.project?.features?.[FeatureUUIDEnum.INTERACTIONS];

  if (BlockTypeEnum.SCRATCHPAD !== blockType) {
    if (![
      BlockTypeEnum.CALLBACK,
      BlockTypeEnum.EXTENSION,
      BlockTypeEnum.MARKDOWN,
    ].includes(blockType)) {
      items.push(...[
        {
          label: () => isDBT
            ? 'Execute and run all upstream blocks'
            : 'Execute with all upstream blocks',
          onClick: () => runBlock({ block, runUpstream: true }),
          uuid: 'execute_upstream',
        },
        {
          label: () => isDBT
            ? 'Execute and run incomplete upstream blocks'
            : 'Execute with incomplete upstream blocks',
          onClick: () => runBlock({ block, runIncompleteUpstream: true }),
          uuid: 'execute_incomplete_upstream',
        },
      ]);

      if (!isDBT && BlockTypeEnum.GLOBAL_DATA_PRODUCT !== blockType) {
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
      downstreamBlocks?.forEach((uuid1: string) => {
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
        items.unshift(...[
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
            }
          ]);
        }
        if (metadata?.dbt?.block?.snapshot) {
          items.unshift(...[
            {
              label: () => 'Run snapshot',
              onClick: () => runBlock({
                block,
                runSettings: {
                  run_model: true,
                },
              }),
              tooltip: () => 'Execute command dbt snapshot.',
              uuid: 'run_model',
            }
          ]);
        }
      }

      if (!isDBT
        && BlockTypeEnum.GLOBAL_DATA_PRODUCT !== blockType
        && savePipelineContent
      ) {
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

      if (blocksMapping || block?.tags) {
        const dynamicChildBlock = upstreamBlocks?.find(
          (uuid: string) => blocksMapping?.[uuid]?.configuration?.dynamic,
        );

        if (dynamicChildBlock || block?.tags?.includes(TagEnum.DYNAMIC_CHILD)) {
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
              if (fetchFileTree) {
                fetchFileTree?.();
              }
              fetchPipeline();
            });
          } else {
            goToWithQuery({
              addon: ViewKeyEnum.CALLBACKS,
              sideview: ViewKeyEnum.ADDON_BLOCKS,
            });
          }
        },
        uuid: 'has_callback',
      });

      items.push({
        label: () => 'Replicate block',
        onClick: () => addNewBlock({
          replicated_block: blockUUID,
        }),
        uuid: 'Replicate block',
      });
    }
  }

  if (isInteractionsEnabled) {
    items.push({
      label: () => 'Add / Edit interactions',
      onClick: () => {
        opts?.openSidekickView?.(ViewKeyEnum.INTERACTIONS);
      },
      uuid: 'Add interactions',
    });
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

export function buildTags(
  { tags }: BlockType,
  opts: {
    conditionFailed?: boolean;
  } = {},
): {
  description?: string;
  title: string;
}[] {
  const arr = [];

  const {
    conditionFailed,
  } = opts;

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
    } else if (TagEnum.CONDITION === tag) {
      if (conditionFailed) {
        arr.push({
          description: 'This block condition evaluated as false.',
          title: 'Condition unmet',
        });
      } else {
        arr.push({
          description: 'This block has a condition that will be run before its execution.',
          title: capitalizeRemoveUnderscoreLower(TagEnum.CONDITION),
        });
      }
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

export function getMessagesWithType(
  messages: KernelOutputType[],
  errorMessages: string[] = null,
): KernelOutputType[] {
  if (errorMessages && errorMessages?.length >= 0) {
    return errorMessages.map((errorMessage: string) => ({
      data: errorMessage,
      execution_state: ExecutionStateEnum.IDLE,
      type: DataTypeEnum.TEXT_PLAIN,
    }));
  }

  return messages.filter((kernelOutput: KernelOutputType) => kernelOutput?.type);
}

export function hasErrorOrOutput(messagesWithType: KernelOutputType[]): {
  hasError: boolean;
  hasOutput: boolean;
} {
  const hasError = !!messagesWithType.find(({ error }) => error);
  const hasOutput = messagesWithType.length >= 1;

  return {
    hasError,
    hasOutput,
  };
}

export const getBlockColorHexCodeMapping = () => (
  Object.values(BlockColorEnum).reduce((acc, color) => ({
    ...acc,
    [color]: getColorsForBlockType(
      BlockTypeEnum.CUSTOM,
      {
        blockColor: color,
      },
    ).accent,
  }), {})
);

export function calculateOffsetPercentage(
  heights: number[],
  totalHeight: number,
  containerHeight: number,
): number {
  const heightsWithValue =
    heights?.reduce((acc, height: number) => !height ? acc : acc.concat(height), []);
  const heightLast = heightsWithValue?.[heightsWithValue?.length - 1] || 0;

  return ((Math.min(heightLast, containerHeight) * 0.25) || 0) / totalHeight;
}
