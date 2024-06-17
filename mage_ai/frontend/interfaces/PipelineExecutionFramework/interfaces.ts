import PipelineType, { PipelineTypeEnum } from '../PipelineType';
import { BlockTypeEnum, DynamicModeEnum, InputDataTypeEnum } from '../BlockType';
import { GroupUUIDEnum, PipelineExecutionFrameworkUUIDEnum } from './types';

export default interface PipelineExecutionFrameworkType extends PipelineType {
  author?: string;
}

export const PipelineExecutionFrameworkRAG: PipelineExecutionFrameworkType = {
  uuid: PipelineExecutionFrameworkUUIDEnum.RAG,
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  blocks: [
    {
      uuid: GroupUUIDEnum.LOAD,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.DATA_PREPARATION,
        GroupUUIDEnum.LOAD,
      ],
      downstream_blocks: [
        GroupUUIDEnum.CLEANING,
      ],
    },
    {
      uuid: GroupUUIDEnum.CLEANING,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.DATA_PREPARATION,
        GroupUUIDEnum.TRANSFORM,
      ],
      downstream_blocks: [
        GroupUUIDEnum.CHUNKING,
      ],
    },
    {
      uuid: GroupUUIDEnum.CHUNKING,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.DATA_PREPARATION,
        GroupUUIDEnum.TRANSFORM,
      ],
      downstream_blocks: [
        GroupUUIDEnum.TOKENIZATION,
      ],
      configuration: {
        dynamic: {
          parent: true,
          modes: [
            DynamicModeEnum.STREAM,
          ],
        },
        variables: {
          upstream: {
            [GroupUUIDEnum.CHUNKING]: {
              input_data_types: [
                InputDataTypeEnum.GENERATOR,
              ],
            },
          },
        },
      },
    },
    {
      uuid: GroupUUIDEnum.TOKENIZATION,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.DATA_PREPARATION,
        GroupUUIDEnum.TRANSFORM,
      ],
      downstream_blocks: [
        GroupUUIDEnum.EMBED,
      ],
    },
    {
      uuid: GroupUUIDEnum.EMBED,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.DATA_PREPARATION,
        GroupUUIDEnum.TRANSFORM,
      ],
      downstream_blocks: [
        GroupUUIDEnum.VECTOR_DATABASE,
        GroupUUIDEnum.KNOWLEDGE_GRAPH,
      ],
    },
    {
      uuid: GroupUUIDEnum.KNOWLEDGE_GRAPH,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.DATA_PREPARATION,
        GroupUUIDEnum.EXPORT,
      ],
    },
    {
      uuid: GroupUUIDEnum.VECTOR_DATABASE,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.DATA_PREPARATION,
        GroupUUIDEnum.EXPORT,
      ],
    },
    {
      uuid: GroupUUIDEnum.INDEX,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.DATA_PREPARATION,
        GroupUUIDEnum.INDEX,
      ],
    },
    {
      uuid: GroupUUIDEnum.QUERY_PROCESSING,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.INFERENCE,
        GroupUUIDEnum.QUERY_PROCESSING,
      ],
      downstream_blocks: [
        GroupUUIDEnum.INTENT_DETECTION,
      ],
    },
    {
      uuid: GroupUUIDEnum.INTENT_DETECTION,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.INFERENCE,
        GroupUUIDEnum.QUERY_PROCESSING,
      ],
      downstream_blocks: [
        GroupUUIDEnum.QUERY_DECOMPOSITION,
      ],
    },
    {
      uuid: GroupUUIDEnum.QUERY_DECOMPOSITION,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.INFERENCE,
        GroupUUIDEnum.QUERY_PROCESSING,
      ],
      downstream_blocks: [
        GroupUUIDEnum.QUERY_AUGMENTATION,
      ],
    },
    {
      uuid: GroupUUIDEnum.QUERY_AUGMENTATION,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.INFERENCE,
        GroupUUIDEnum.QUERY_PROCESSING,
      ],
      downstream_blocks: [
        GroupUUIDEnum.RETRIEVAL,
      ],
    },
    {
      uuid: GroupUUIDEnum.RETRIEVAL,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.INFERENCE,
        GroupUUIDEnum.RETRIEVAL,
      ],
      downstream_blocks: [
        GroupUUIDEnum.RANKING,
      ],
    },
    {
      uuid: GroupUUIDEnum.RANKING,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.INFERENCE,
        GroupUUIDEnum.RETRIEVAL,
      ],
      downstream_blocks: [
        GroupUUIDEnum.RESPONSE_GENERATION,
      ],
    },
    {
      uuid: GroupUUIDEnum.RESPONSE_GENERATION,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.INFERENCE,
        GroupUUIDEnum.RESPONSE_GENERATION,
      ],
      downstream_blocks: [
        GroupUUIDEnum.CONTEXTUALIZATION,
      ],
    },
    {
      uuid: GroupUUIDEnum.CONTEXTUALIZATION,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.INFERENCE,
        GroupUUIDEnum.RESPONSE_GENERATION,
      ],
      downstream_blocks: [
        GroupUUIDEnum.RESPONSE_SYNTHESIS,
      ],
    },
    {
      uuid: GroupUUIDEnum.RESPONSE_SYNTHESIS,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.INFERENCE,
        GroupUUIDEnum.RESPONSE_GENERATION,
      ],
      downstream_blocks: [
        GroupUUIDEnum.ANSWER_ENRICHMENT,
      ],
    },
    {
      uuid: GroupUUIDEnum.ANSWER_ENRICHMENT,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.INFERENCE,
        GroupUUIDEnum.RESPONSE_GENERATION,
      ],
      downstream_blocks: [
        GroupUUIDEnum.RESPONSE_FORMATTING,
      ],
    },
    {
      uuid: GroupUUIDEnum.RESPONSE_FORMATTING,
      type: BlockTypeEnum.GROUP,
      groups: [
        GroupUUIDEnum.INFERENCE,
        GroupUUIDEnum.RESPONSE_GENERATION,
      ],
    },
  ],
};
