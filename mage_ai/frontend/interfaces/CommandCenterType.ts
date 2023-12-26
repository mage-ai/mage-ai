import { BlockTypeEnum } from '@interfaces/BlockType';
import { FileExtensionEnum } from '@interfaces/FileType';
import { OperationTypeEnum } from '@interfaces/PageComponentType';

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

interface CommandCenterActionBaseType {
  interaction?: any;
  page?: any;
  request?: any;
}

enum CommandCenterActionInteractionEventEnum {
  CLICK = 'click',
  SCROLL = 'scroll',
}

interface CommandCenterActionInteractionType {
  element: {
    className?: string;
    id?: string;
  };
  event?: CommandCenterActionInteractionEventEnum;
  eventOptions?:{
    [key: string]: string | number | boolean;
  };
}

interface CommandCenterActionPageType {
  external?: boolean;
  openNewWindow?: boolean;
  path: string;
  query?: {
    [key: string]: string | number | boolean;
  };
}

interface CommandCenterActionRequestType {
  meta?: {
    [key: string]: string | number | boolean;
  };
  operation: OperationTypeEnum;
  payload?: {
    [key: string]: string | number | boolean;
  };
  query?: {
    [key: string]: string | number | boolean;
  };
  resource: string;
  resource_id: string | number;
  resource_parent: string;
  resource_parent_id: string | number;
}

interface CommandCenterActionType extends CommandCenterActionBaseType {
  interaction?: CommandCenterActionInteractionType;
  page?: CommandCenterActionPageType;
  request?: CommandCenterActionRequestType;
}

export interface CommandCenterItemType {
  actions?: CommandCenterActionType[];
  description?: string;
  items?: CommandCenterItemType[];
  metadata?: {
    block?: BlockMetadataType;
    file?: FileMetadataType;
  };
  subtype?: CommandCenterTypeEnum;
  title: string;
  type: CommandCenterTypeEnum;
  uuid: string;
}
