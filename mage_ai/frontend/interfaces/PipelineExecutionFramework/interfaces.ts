import BlockType, { BlockTypeEnum, DynamicModeEnum, InputDataTypeEnum } from '../BlockType';
import { GroupUUIDEnum, PipelineExecutionFrameworkUUIDEnum } from './types';
import { InteractionInputTypeEnum, InteractionVariableTypeEnum } from '../InteractionType';
import { PipelineTypeEnum } from '../PipelineType';
import { extractNestedBlocks } from '@utils/models/pipeline';

export type PipelineExecutionFrameworkBlockType = BlockType & {
  downstream_blocks?: GroupUUIDEnum[];
  groups?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
  type?: BlockTypeEnum.GROUP | BlockTypeEnum.PIPELINE;
  upstream_blocks?: GroupUUIDEnum[];
  uuid: GroupUUIDEnum;
};

type PipelineExecutionFrameworkType = {
  blocks: PipelineExecutionFrameworkBlockType[];
  groups?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
  name?: string;
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK;
  uuid: GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum;
};

export default PipelineExecutionFrameworkType;

export const InferencePipelineExecutionFramework: PipelineExecutionFrameworkType = {
  name: 'Inference',
  uuid: GroupUUIDEnum.INFERENCE,
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  groups: [PipelineExecutionFrameworkUUIDEnum.RAG],
  blocks: [
    {
      uuid: GroupUUIDEnum.INTENT_DETECTION,
      groups: [GroupUUIDEnum.QUERY_PROCESSING],
      downstream_blocks: [
        GroupUUIDEnum.QUERY_DECOMPOSITION,
      ],
    },
    {
      uuid: GroupUUIDEnum.QUERY_DECOMPOSITION,
      groups: [GroupUUIDEnum.QUERY_PROCESSING],
      downstream_blocks: [
        GroupUUIDEnum.QUERY_AUGMENTATION,
      ],
    },
    {
      uuid: GroupUUIDEnum.QUERY_AUGMENTATION,
      groups: [GroupUUIDEnum.QUERY_PROCESSING],
      downstream_blocks: [
        GroupUUIDEnum.MEMORY,
      ],
    },
    {
      uuid: GroupUUIDEnum.MEMORY,
      groups: [GroupUUIDEnum.RETRIEVAL],
      downstream_blocks: [
        GroupUUIDEnum.ITERATIVE_RETRIEVAL,
      ],
    },
    {
      uuid: GroupUUIDEnum.ITERATIVE_RETRIEVAL,
      groups: [GroupUUIDEnum.RETRIEVAL],
      downstream_blocks: [
        GroupUUIDEnum.MULTI_HOP_REASONING,
      ],
    },
    {
      uuid: GroupUUIDEnum.MULTI_HOP_REASONING,
      groups: [GroupUUIDEnum.RETRIEVAL],
      downstream_blocks: [
        GroupUUIDEnum.RANKING,
      ],
    },
    {
      uuid: GroupUUIDEnum.RANKING,
      groups: [GroupUUIDEnum.RETRIEVAL],
      downstream_blocks: [
        GroupUUIDEnum.CONTEXTUALIZATION,
      ],
    },
    {
      uuid: GroupUUIDEnum.CONTEXTUALIZATION,
      groups: [GroupUUIDEnum.RESPONSE_GENERATION],
      downstream_blocks: [
        GroupUUIDEnum.RESPONSE_SYNTHESIS,
      ],
    },
    {
      uuid: GroupUUIDEnum.RESPONSE_SYNTHESIS,
      groups: [GroupUUIDEnum.RESPONSE_GENERATION],
      downstream_blocks: [
        GroupUUIDEnum.ANSWER_ENRICHMENT,
      ],
    },
    {
      uuid: GroupUUIDEnum.ANSWER_ENRICHMENT,
      groups: [GroupUUIDEnum.RESPONSE_GENERATION],
      downstream_blocks: [
        GroupUUIDEnum.RESPONSE_FORMATTING,
      ],
    },
    {
      uuid: GroupUUIDEnum.RESPONSE_FORMATTING,
      groups: [GroupUUIDEnum.RESPONSE_GENERATION],
    },
  ],
};

export const DataPreparationPipelineExecutionFramework: PipelineExecutionFrameworkType = {
  name: 'Data preparation',
  uuid: GroupUUIDEnum.DATA_PREPARATION,
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  groups: [PipelineExecutionFrameworkUUIDEnum.RAG],
  blocks: [
    {
      uuid: GroupUUIDEnum.INGEST,
      groups: [GroupUUIDEnum.LOAD],
      downstream_blocks: [
        GroupUUIDEnum.MAP,
      ],
    },
    {
      uuid: GroupUUIDEnum.MAP,
      groups: [GroupUUIDEnum.LOAD],
      downstream_blocks: [
        GroupUUIDEnum.CLEANING,
      ],
    },
    {
      uuid: GroupUUIDEnum.CLEANING,
      groups: [GroupUUIDEnum.TRANSFORM],
      downstream_blocks: [
        GroupUUIDEnum.ENRICH,
      ],
    },
    {
      uuid: GroupUUIDEnum.ENRICH,
      groups: [GroupUUIDEnum.TRANSFORM],
      downstream_blocks: [
        GroupUUIDEnum.CHUNKING,
      ],
    },
    {
      uuid: GroupUUIDEnum.CHUNKING,
      groups: [GroupUUIDEnum.TRANSFORM],
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
      groups: [GroupUUIDEnum.TRANSFORM],
      downstream_blocks: [
        GroupUUIDEnum.EMBED,
      ],
      configuration: {
        templates: {
          subword_tokenizer: {
            name: 'Subword tokenizer',
            description: 'Tokenize text into subwords',
            variables: [
              'hallucination',
              'fire',
              'spell',
              'max_length',
              'add_special_tokens',
            ].reduce((acc, uuid) => ({
              ...acc,
              [uuid]: {
                input: {
                  description: '...',
                  label: `${uuid} - ${Number(new Date())}`,
                  options: [
                    {
                      label: `${uuid} - ${Number(new Date())}`,
                      value: 'none',
                    },
                  ],
                  type: InteractionInputTypeEnum.DROPDOWN_MENU,
                },
                variable: {
                  description: '...',
                  name: '...',
                  required: true,
                  types: [InteractionVariableTypeEnum.STRING],
                },
              },
            }), {}),
          },
          word_tokenizer: {
            'name': 'Word Tokenizer',
            'description': 'Tokenize text into words',
            variables: [
              'hallucination_variable',
              'fire_variable',
              'spell_variable',
              'max_length_variable',
              'add_special_tokens_variable',
            ].reduce((acc, uuid) => ({
              ...acc,
              [uuid]: {
                'input': {
                  'description': 'Enter the text you want to tokenize into words.',
                  'label': `${uuid} - ${Number(new Date())}`,
                  'style': {
                    multiline: true,
                  },
                  'type': InteractionInputTypeEnum.TEXT_FIELD,
                },
                'variable': {
                  'description': 'The variable to store the tokenized words.',
                  'name': 'tokenized_words',
                  'required': true,
                  'types': [InteractionVariableTypeEnum.STRING],
                  'uuid': '',
                },
              },
            }), {}),
          },
        },
      },
    },
    {
      uuid: GroupUUIDEnum.EMBED,
      groups: [GroupUUIDEnum.TRANSFORM],
      downstream_blocks: [
        GroupUUIDEnum.VECTOR_DATABASE,
        GroupUUIDEnum.KNOWLEDGE_GRAPH,
      ],
      configuration: {
        templates: {
          bert_embedding: {
            'name': 'BERT Embedding',
            'description': 'Generate BERT embeddings for the provided text.',
            variables: {
              bert_embeddings_uuid: {
                'input': {
                  'description': 'Input text for BERT embeddings.',
                  'label': 'Text Input',
                  'style': {
                    'multiline': true,
                  },
                  'type': InteractionInputTypeEnum.TEXT_FIELD,
                },
                'variable': {
                  'description': 'The variable to store BERT embeddings.',
                  'name': 'bert_embeddings',
                  'required': true,
                  'types': [InteractionVariableTypeEnum.DATE],
                },
              },
            },
          },
          word2vec_embedding: {
            'name': 'Word2Vec Embedding',
            'description': 'Generate Word2Vec embeddings for the provided text.',
            variables: {
              word2vec_embeddings_uuid: {
                'input': {
                  'description': 'Input text for Word2Vec embeddings.',
                  'label': 'Text Input',
                  'style': {
                    'multiline': true,
                  },
                  'type': InteractionInputTypeEnum.TEXT_FIELD,
                },
                'variable': {
                  'description': 'The variable to store Word2Vec embeddings.',
                  'name': 'word2vec_embeddings',
                  'required': true,
                  'types': [InteractionVariableTypeEnum.DATE],
                },
              },
            },
          },
        },
      },
    },
    {
      uuid: GroupUUIDEnum.KNOWLEDGE_GRAPH,
      groups: [GroupUUIDEnum.EXPORT],
    },
    {
      uuid: GroupUUIDEnum.VECTOR_DATABASE,
      groups: [GroupUUIDEnum.EXPORT],
      downstream_blocks: [
        GroupUUIDEnum.CONTEXTUAL_DICTIONARY,
        GroupUUIDEnum.DOCUMENT_HIERARCHY,
        GroupUUIDEnum.SEARCH_INDEX,
      ],
    },
    {
      uuid: GroupUUIDEnum.CONTEXTUAL_DICTIONARY,
      groups: [GroupUUIDEnum.INDEX],
    },
    {
      uuid: GroupUUIDEnum.DOCUMENT_HIERARCHY,
      groups: [GroupUUIDEnum.INDEX],
    },
    {
      uuid: GroupUUIDEnum.SEARCH_INDEX,
      groups: [GroupUUIDEnum.INDEX],
    },
  ],
};

[
  DataPreparationPipelineExecutionFramework,
  InferencePipelineExecutionFramework,
].forEach((framework: PipelineExecutionFrameworkType) => {
  const blocks = framework.blocks;
  const blockUpsDownsMapping: Record<string, {
    downstream_blocks: Record<string, PipelineExecutionFrameworkBlockType>,
    upstream_blocks: Record<string, PipelineExecutionFrameworkBlockType>,
  }> = {};

  blocks.forEach((block: PipelineExecutionFrameworkBlockType) => {
    blockUpsDownsMapping[block.uuid] ||= {
      downstream_blocks: {},
      upstream_blocks: {},
    };

    block?.downstream_blocks?.forEach((uuid: string) => {
      blockUpsDownsMapping[uuid] ||= {
        downstream_blocks: {},
        upstream_blocks: {},
      };
      blockUpsDownsMapping[uuid].upstream_blocks ||= {};
      blockUpsDownsMapping[uuid].upstream_blocks[block.uuid] = block;

      const downstreamBlock = blocks.find((b) => b.uuid === uuid);
      if (downstreamBlock) {
        blockUpsDownsMapping[block.uuid].downstream_blocks ||= {};
        blockUpsDownsMapping[block.uuid].downstream_blocks[uuid] = downstreamBlock;
      }
    });

    block?.upstream_blocks?.forEach((uuid: string) => {
      blockUpsDownsMapping[uuid] ||= {
        downstream_blocks: {},
        upstream_blocks: {},
      };
      blockUpsDownsMapping[uuid].downstream_blocks ||= {};
      blockUpsDownsMapping[uuid].downstream_blocks[block.uuid] = block;

      const upstreamBlock = blocks.find((b) => b.uuid === uuid);
      if (upstreamBlock) {
        blockUpsDownsMapping[block.uuid].upstream_blocks ||= {};
        blockUpsDownsMapping[block.uuid].upstream_blocks[uuid] = upstreamBlock;
      }
    });
  });

  framework.blocks.forEach((block: PipelineExecutionFrameworkBlockType) => {
    block.type = BlockTypeEnum.GROUP;
    block.downstream_blocks = Object.values(blockUpsDownsMapping[block.uuid]?.downstream_blocks ?? {}).map(b => b.uuid);
    block.upstream_blocks = Object.values(blockUpsDownsMapping[block.uuid]?.upstream_blocks ?? {}).map(b => b.uuid);
  });
});

export const RAGPipelineExecutionFramework: PipelineExecutionFrameworkType = {
  blocks: [
    {
      uuid: GroupUUIDEnum.DATA_PREPARATION,
      type: BlockTypeEnum.PIPELINE,
    },
    {
      uuid: GroupUUIDEnum.INFERENCE,
      type: BlockTypeEnum.PIPELINE,
    },
    {
      uuid: GroupUUIDEnum.NONE,
      type: BlockTypeEnum.GROUP,
    },
  ],
  name: PipelineExecutionFrameworkUUIDEnum.RAG,
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  uuid: PipelineExecutionFrameworkUUIDEnum.RAG,
};
