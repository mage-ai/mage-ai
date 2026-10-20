import PipelineExecutionFrameworkType from '../interfaces';
import { BlockTypeEnum, DynamicModeEnum, InputDataTypeEnum } from '../../BlockType';
import { InteractionInputTypeEnum, InteractionVariableTypeEnum } from '../../InteractionType';
import { PipelineExecutionFrameworkUUIDEnum, GroupUUIDEnum } from '../types';
import { PipelineTypeEnum } from '../../PipelineType';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

export const Load: PipelineExecutionFrameworkType = {
  uuid: GroupUUIDEnum.LOAD,
  groups: [GroupUUIDEnum.LOAD],
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  // @ts-ignore
  blocks: [
    {
      uuid: GroupUUIDEnum.INGEST,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [],
      downstream_blocks: [GroupUUIDEnum.MAP],
      configuration: {
        templates: {
          files: {
            description: 'Load files',
            name: 'Local file loader',
            variables: {
              path: {
                inputs: {
                  text: {
                    description: 'Path to file directory',
                    label: 'Directory path',
                    options: null,
                    style: {
                      monospace: true,
                    },
                    text: [],
                    type: InteractionInputTypeEnum.TEXT_FIELD,
                  },
                },
                variables: {
                  path: {
                    description: 'Already explained',
                    input: 'text',
                    name: 'Path to file directory',
                    required: true,
                    types: [InteractionVariableTypeEnum.STRING],
                  },
                },
              },
            },
          },
          github: {
            description: 'Fetch GitHub repository',
            name: 'GitHub repository loader',
            variables: {
              path: {
                inputs: {
                  text: {
                    description: 'GitHub repository URL',
                    label: 'Repo URL',
                    options: null,
                    style: {
                      monospace: true,
                    },
                    text: [],
                    type: InteractionInputTypeEnum.TEXT_FIELD,
                  },
                },
                variables: {
                  url: {
                    description: 'Already explained',
                    input: 'text',
                    name: 'Address of the repository',
                    required: true,
                    types: [InteractionVariableTypeEnum.STRING],
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      uuid: GroupUUIDEnum.MAP,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.INGEST],
      downstream_blocks: [],
    },
  ]?.map(b => ({ ...b, name: capitalizeRemoveUnderscoreLower(b.uuid) })),
};

export const Transform: PipelineExecutionFrameworkType = {
  uuid: GroupUUIDEnum.TRANSFORM,
  groups: [GroupUUIDEnum.TRANSFORM],
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  // @ts-ignore
  blocks: [
    {
      uuid: GroupUUIDEnum.CLEANING,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [],
      downstream_blocks: [GroupUUIDEnum.ENRICH],
    },
    {
      uuid: GroupUUIDEnum.ENRICH,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.CLEANING],
      downstream_blocks: [GroupUUIDEnum.CHUNKING],
    },
    {
      uuid: GroupUUIDEnum.CHUNKING,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.ENRICH],
      downstream_blocks: [GroupUUIDEnum.TOKENIZATION],
      configuration: {
        dynamic: {
          parent: true,
          modes: [DynamicModeEnum.STREAM],
        },
        variables: {
          upstream: {
            [GroupUUIDEnum.CHUNKING]: {
              input_data_types: [InputDataTypeEnum.GENERATOR],
            },
          },
        },
      },
    },
    {
      uuid: GroupUUIDEnum.TOKENIZATION,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.CHUNKING],
      downstream_blocks: [GroupUUIDEnum.EMBED],
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
            ].reduce(
              (acc, uuid) => ({
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
              }),
              {},
            ),
          },
          word_tokenizer: {
            name: 'Word Tokenizer',
            description: 'Tokenize text into words',
            variables: [
              'hallucination_variable',
              'fire_variable',
              'spell_variable',
              'max_length_variable',
              'add_special_tokens_variable',
            ].reduce(
              (acc, uuid) => ({
                ...acc,
                [uuid]: {
                  input: {
                    description: 'Enter the text you want to tokenize into words.',
                    label: `${uuid} - ${Number(new Date())}`,
                    style: {
                      multiline: true,
                    },
                    type: InteractionInputTypeEnum.TEXT_FIELD,
                  },
                  variable: {
                    description: 'The variable to store the tokenized words.',
                    name: 'tokenized_words',
                    required: true,
                    types: [InteractionVariableTypeEnum.STRING],
                    uuid: '',
                  },
                },
              }),
              {},
            ),
          },
        },
      },
    },
    {
      uuid: GroupUUIDEnum.EMBED,
      type: BlockTypeEnum.GROUP,
      upstream_blocks: [GroupUUIDEnum.TOKENIZATION],
      configuration: {
        templates: {
          bert_embedding: {
            name: 'BERT Embedding',
            description: 'Generate BERT embeddings for the provided text.',
            variables: {
              bert_embeddings_uuid: {
                input: {
                  description: 'Input text for BERT embeddings.',
                  label: 'Text Input',
                  style: {
                    multiline: true,
                  },
                  type: InteractionInputTypeEnum.TEXT_FIELD,
                },
                variable: {
                  description: 'The variable to store BERT embeddings.',
                  name: 'bert_embeddings',
                  required: true,
                  types: [InteractionVariableTypeEnum.DATE],
                },
              },
            },
          },
          word2vec_embedding: {
            name: 'Word2Vec Embedding',
            description: 'Generate Word2Vec embeddings for the provided text.',
            variables: {
              word2vec_embeddings_uuid: {
                input: {
                  description: 'Input text for Word2Vec embeddings.',
                  label: 'Text Input',
                  style: {
                    multiline: true,
                  },
                  type: InteractionInputTypeEnum.TEXT_FIELD,
                },
                variable: {
                  description: 'The variable to store Word2Vec embeddings.',
                  name: 'word2vec_embeddings',
                  required: true,
                  types: [InteractionVariableTypeEnum.DATE],
                },
              },
            },
          },
        },
      },
    },
  ]?.map(b => ({ ...b, name: capitalizeRemoveUnderscoreLower(b.uuid) })),
};

export const Export: PipelineExecutionFrameworkType = {
  uuid: GroupUUIDEnum.EXPORT,
  groups: [GroupUUIDEnum.EXPORT],
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  // @ts-ignore
  blocks: [
    {
      uuid: GroupUUIDEnum.KNOWLEDGE_GRAPH,
      type: BlockTypeEnum.GROUP,
    },
    {
      uuid: GroupUUIDEnum.VECTOR_DATABASE,
      type: BlockTypeEnum.GROUP,
    },
  ]?.map(b => ({ ...b, name: capitalizeRemoveUnderscoreLower(b.uuid) })),
};

export const Index: PipelineExecutionFrameworkType = {
  uuid: GroupUUIDEnum.INDEX,
  groups: [GroupUUIDEnum.INDEX],
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  // @ts-ignore
  blocks: [
    {
      uuid: GroupUUIDEnum.CONTEXTUAL_DICTIONARY,
      type: BlockTypeEnum.GROUP,
    },
    {
      uuid: GroupUUIDEnum.DOCUMENT_HIERARCHY,
      type: BlockTypeEnum.GROUP,
    },
    {
      uuid: GroupUUIDEnum.SEARCH_INDEX,
      type: BlockTypeEnum.GROUP,
    },
  ]?.map(b => ({ ...b, name: capitalizeRemoveUnderscoreLower(b.uuid) })),
};

const DataPreparation: PipelineExecutionFrameworkType = {
  uuid: GroupUUIDEnum.DATA_PREPARATION,
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  groups: [GroupUUIDEnum.DATA_PREPARATION],
  execution_framework: PipelineExecutionFrameworkUUIDEnum.RAG,
  // @ts-ignore
  blocks: [
    {
      uuid: Load.uuid,
      type: BlockTypeEnum.PIPELINE,
      upstream_blocks: [],
      downstream_blocks: [Transform.uuid],
    },
    {
      uuid: Transform.uuid,
      type: BlockTypeEnum.PIPELINE,
      upstream_blocks: [Load.uuid],
      downstream_blocks: [Export.uuid],
    },
    {
      uuid: Export.uuid,
      type: BlockTypeEnum.PIPELINE,
      upstream_blocks: [Transform.uuid],
      downstream_blocks: [Index.uuid],
    },
    {
      uuid: Index.uuid,
      type: BlockTypeEnum.PIPELINE,
      upstream_blocks: [Export.uuid],
      downstream_blocks: [],
    },
  ]?.map(b => ({ ...b, name: capitalizeRemoveUnderscoreLower(b.uuid) })),
};

export default DataPreparation;
