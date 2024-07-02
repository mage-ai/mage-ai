import { AppNodeType, OutputNodeType, RectType } from '../interfaces';
import { DragAndDropType } from './types';
import { ExecutionManagerType } from '../../ExecutionManager/interfaces';

export type CanvasNodeType = {
  draggable?: boolean;
  node: AppNodeType | OutputNodeType;
  rect: RectType;
  registerConsumer?: ExecutionManagerType['registerConsumer'];
} & DragAndDropType;
