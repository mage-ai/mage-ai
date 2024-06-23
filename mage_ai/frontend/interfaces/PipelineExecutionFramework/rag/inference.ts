import PipelineExecutionFrameworkType from '../interfaces';
import { BlockTypeEnum } from '../../BlockType';
import { PipelineExecutionFrameworkUUIDEnum, GroupUUIDEnum } from '../types';
import { PipelineTypeEnum } from '../../PipelineType';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

export const QueryProcessing: PipelineExecutionFrameworkType = {
  uuid: GroupUUIDEnum.QUERY_PROCESSING,
  groups: [GroupUUIDEnum.QUERY_PROCESSING],
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  blocks: [
    {
      uuid: GroupUUIDEnum.INTENT_DETECTION,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [],
      downstream_blocks: [GroupUUIDEnum.QUERY_DECOMPOSITION],
    },
    {
      uuid: GroupUUIDEnum.QUERY_DECOMPOSITION,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.INTENT_DETECTION],
      downstream_blocks: [GroupUUIDEnum.QUERY_AUGMENTATION],
    },
    {
      uuid: GroupUUIDEnum.QUERY_AUGMENTATION,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.QUERY_DECOMPOSITION],
      downstream_blocks: [],
    },
  ]?.map(b => ({ ...b, name: capitalizeRemoveUnderscoreLower(b.uuid) })),
};

export const Retrieval: PipelineExecutionFrameworkType = {
  uuid: GroupUUIDEnum.RETRIEVAL,
  groups: [GroupUUIDEnum.RETRIEVAL],
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  blocks: [
    {
      uuid: GroupUUIDEnum.MEMORY,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [],
      downstream_blocks: [GroupUUIDEnum.ITERATIVE_RETRIEVAL],
    },
    {
      uuid: GroupUUIDEnum.ITERATIVE_RETRIEVAL,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.MEMORY],
      downstream_blocks: [GroupUUIDEnum.MULTI_HOP_REASONING],
    },
    {
      uuid: GroupUUIDEnum.MULTI_HOP_REASONING,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.ITERATIVE_RETRIEVAL],
      downstream_blocks: [GroupUUIDEnum.RANKING],
    },
    {
      uuid: GroupUUIDEnum.RANKING,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.MULTI_HOP_REASONING],
      downstream_blocks: [],
    },
  ]?.map(b => ({ ...b, name: capitalizeRemoveUnderscoreLower(b.uuid) })),
};

export const ResponseGeneration: PipelineExecutionFrameworkType = {
  uuid: GroupUUIDEnum.RESPONSE_GENERATION,
  groups: [GroupUUIDEnum.RESPONSE_GENERATION],
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  blocks: [
    {
      uuid: GroupUUIDEnum.CONTEXTUALIZATION,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [],
      downstream_blocks: [GroupUUIDEnum.RESPONSE_SYNTHESIS],
    },
    {
      uuid: GroupUUIDEnum.RESPONSE_SYNTHESIS,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.CONTEXTUALIZATION],
      downstream_blocks: [GroupUUIDEnum.ANSWER_ENRICHMENT],
    },
    {
      uuid: GroupUUIDEnum.ANSWER_ENRICHMENT,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.RESPONSE_SYNTHESIS],
      downstream_blocks: [GroupUUIDEnum.RESPONSE_FORMATTING],
    },
    {
      uuid: GroupUUIDEnum.RESPONSE_FORMATTING,
      upstream_blocks: [GroupUUIDEnum.ANSWER_ENRICHMENT],
      type: BlockTypeEnum.GROUP,
    },
  ]?.map(b => ({ ...b, name: capitalizeRemoveUnderscoreLower(b.uuid) })),
};

const Inference: PipelineExecutionFrameworkType = {
  uuid: GroupUUIDEnum.INFERENCE,
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  groups: [GroupUUIDEnum.INFERENCE],
  execution_framework: PipelineExecutionFrameworkUUIDEnum.RAG,
  blocks: [
    {
      uuid: QueryProcessing.uuid,
      type: BlockTypeEnum.PIPELINE,
      upstream_blocks: [],
      downstream_blocks: [Retrieval.uuid],
    },
    {
      uuid: Retrieval.uuid,
      type: BlockTypeEnum.PIPELINE,
      upstream_blocks: [QueryProcessing.uuid],
      downstream_blocks: [ResponseGeneration.uuid],
    },
    {
      uuid: ResponseGeneration.uuid,
      type: BlockTypeEnum.PIPELINE,
      upstream_blocks: [Retrieval.uuid],
      downstream_blocks: [],
    },
  ]?.map(b => ({ ...b, name: capitalizeRemoveUnderscoreLower(b.uuid) })),
};

export default Inference;
