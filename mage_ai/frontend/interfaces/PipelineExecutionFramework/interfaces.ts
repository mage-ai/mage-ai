import PipelineType, { PipelineTypeEnum } from '../PipelineType';
import { BlockTypeEnum, DynamicModeEnum, InputDataTypeEnum } from '../BlockType';
import { GroupUUIDEnum, PipelineExecutionFrameworkUUIDEnum } from './types';
import { InteractionInputTypeEnum, InteractionVariableTypeEnum } from '../InteractionType';

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
      configuration: {
        templates: {
          subword_tokenizer: {
            name: 'Subword tokenizer',
            description: 'Tokenize text into subwords',
            variables: {
              hallucination: {
                input: {
                  description: '...',
                  label: '...',
                  options: [
                    {
                      label: 'Default hallucination',
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
            },
          },
          word_tokenizer: {
            'name': 'Word Tokenizer',
            'description': 'Tokenize text into words',
            variables: {
              spacing: {
                'input': {
                  'description': 'Enter the text you want to tokenize into words.',
                  'label': 'Text Input',
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
            },
          },
        },
      },
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
