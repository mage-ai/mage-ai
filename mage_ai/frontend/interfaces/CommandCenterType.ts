import { BlockTypeEnum } from '@interfaces/BlockType';
import { FileExtensionEnum } from '@interfaces/FileType';

export enum CommandCenterTypeEnum {
  ACTION = 'action',
  APPLICATION = 'application',
  BLOCK = 'block',
  FILE = 'file',
  PIPELINE = 'pipeline',
  TRIGGER = 'trigger',
}

export const TYPE_TITLE_MAPPING = {
  [CommandCenterTypeEnum.ACTION]: 'Cast',
  [CommandCenterTypeEnum.APPLICATION]: 'Teleport',
  [CommandCenterTypeEnum.BLOCK]: 'Enchant',
  [CommandCenterTypeEnum.FILE]: 'Summon',
  [CommandCenterTypeEnum.PIPELINE]: 'Enchant',
  [CommandCenterTypeEnum.TRIGGER]: 'Enchant',
};

interface BlockMetadataType {
  type?: BlockTypeEnum;
}

interface FileMetadataType {
  extension?: FileExtensionEnum;
}

export interface CommandCenterItemType {
  description?: string;
  metadata?: {
    block?: BlockMetadataType;
    file?: FileMetadataType;
  };
  subtype?: CommandCenterTypeEnum;
  title: string;
  type: CommandCenterTypeEnum;
  uuid: string;
}
