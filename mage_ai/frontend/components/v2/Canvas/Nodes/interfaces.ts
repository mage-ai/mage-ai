import {
  AppNodeType,
  NodeItemType,
  OutputNodeType,
  RectType,
  LayoutConfigType,
} from '../interfaces';
import { DragAndDropType } from './types';

export type CanvasNodeType = {
  draggable?: boolean;
  node: AppNodeType | OutputNodeType;
  rect: RectType;
} & DragAndDropType;

export type BlockNode = {
  activeLevel?: React.RefObject<number>;
  layoutConfig?: React.RefObject<LayoutConfigType>;
  collapsed?: boolean;
  droppable?: boolean;
  draggable?: boolean;
  index?: number;
  node: NodeItemType;
  submitEventOperation?: (event: Event, options?: { args: any[] }) => void;
};
