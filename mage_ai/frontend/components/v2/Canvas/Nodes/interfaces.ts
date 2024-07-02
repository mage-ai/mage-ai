import { AppNodeType, OutputNodeType, RectType } from '../interfaces';
import { DragAndDropType } from './types';

export type CanvasNodeType = {
  draggable?: boolean;
  node: AppNodeType | OutputNodeType;
  rect: RectType;
} & DragAndDropType;
