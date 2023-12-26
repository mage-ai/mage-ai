import { BlockTypeEnum } from '@interfaces/BlockType';

export enum CommandCenterTypeEnum {
  ACTION = 'action',
  APPLICATION = 'application',
  BLOCK = 'block',
  FILE = 'file',
  PIPELINE = 'pipeline',
  TRIGGER = 'trigger',
}

interface BlockMetadataType {
  type?: BlockTypeEnum;
}

export interface CommandCenterItemType {
  description?: string;
  metadata?: {
    block?: BlockMetadataType;
  };
  subtype?: CommandCenterTypeEnum;
  title: string;
  type: CommandCenterTypeEnum;
}
