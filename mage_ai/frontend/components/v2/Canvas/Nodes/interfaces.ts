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
  node: any;
  rect: any;
} & any;

export type BlockNode = {
  activeLevel?: React.RefObject<any>;
  layoutConfig?: React.RefObject<any>;
  collapsed?: boolean;
  droppable?: boolean;
  draggable?: boolean;
  index?: number;
  node: any;
  submitEventOperation?: (event: Event, options?: { args: any[] }) => void;
};
