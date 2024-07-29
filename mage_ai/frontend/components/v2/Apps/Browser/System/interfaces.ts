import { ElementRoleEnum } from '@mana/shared/types';
import { DragInfo } from '@mana/shared/interfaces';
import { FileType } from '../../../IDE/interfaces';
import { ItemTypeEnum } from './enums';
import { BlockTypeEnum } from '@interfaces/BlockType';

export interface ItemDetailType extends FileType {
  items?: ItemType;
  parent?: ItemDetailType;
  type: ItemTypeEnum;
}

export interface ItemType {
  [key: string]: ItemType | ItemDetailType;
}

type DragHandlers = {
  onDrag?: (event: any, info: DragInfo) => void;
  onDragEnd?: (event: any, info: DragInfo) => void;
  onPointerUp?: (event: any, info: DragInfo) => void;
  onPointerDown?: (event: any, info: DragInfo) => void;
};

type DragSettings = {
  drag?: string | boolean;
  dragControls?: any;
  dragMomentum?: boolean;
  dragPropagation?: boolean;
  initial?: any;
  role?: ElementRoleEnum;
  style?: any;
} & DragHandlers;

export type DragSettingsType = (item: ItemType, opts?: {
  blockType?: BlockTypeEnum;
  isBlockFile?: boolean;
  isFolder?: boolean;
  path?: string;
}) => DragSettings;
