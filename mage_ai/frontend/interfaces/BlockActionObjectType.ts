import { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';

export enum ObjectType {
  BLOCK_FILE = 'block_file',
  CUSTOM_BLOCK_TEMPLATE = 'custom_block_template',
  GENERATE_BLOCK = 'generate_block',
  MAGE_TEMPLATE = 'mage_template',
}

export default interface BlockActionObjectType {
  block_type?: BlockTypeEnum;
  description?: string;
  language?: BlockLanguageEnum;
  object_type: ObjectType;
  title?: string;
  uuid: string;
}
