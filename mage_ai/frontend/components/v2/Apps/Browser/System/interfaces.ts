import { ElementRoleEnum } from '@mana/shared/types';
import { DragInfo } from '@mana/shared/interfaces';
import { FileType } from '../../../IDE/interfaces';
import { ItemTypeEnum } from './enums';

export interface ItemDetailType extends FileType {
  items?: ItemType;
  parent?: ItemDetailType;
  type: ItemTypeEnum;
}

export interface ItemType {
  [key: string]: ItemType | ItemDetailType;
}

interface DragHandlers {
  onDrag?: (event: any, info: DragInfo) => void;
  onDragEnd?: (event: any, info: DragInfo) => void;
  onPointerUp?: (event: any, info: DragInfo) => void;
  onPointerDown?: (event: any, info: DragInfo) => void;
}

export interface DragSettingsType extends DragHandlers {
  drag?: string | boolean;
  dragControls?: any;
  dragMomentum?: boolean;
  dragPropagation?: boolean;
  initial?: any;
  role?: ElementRoleEnum;
  style?: any;
}
