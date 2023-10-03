import { InteractionLayoutItemType, InteractionVariableTypeEnum } from './InteractionType';
import { ScheduleIntervalEnum, ScheduleTypeEnum } from './PipelineScheduleType';

export interface BlockInteractionTriggerType {
  schedule_interval?: ScheduleIntervalEnum;
  schedule_type?: ScheduleTypeEnum;
}

export interface BlockInteractionVariableType; {
  disabled?: boolean;
  required?: boolean;
  types?: InteractionVariableTypeEnum[];
  uuid_override?: string;
}

export interface InteractionPermission {
  roles?: string[];
  triggers?: BlockInteractionTriggerType[];
}

export interface BlockInteractionType {
  description?: string;
  layout?: InteractionLayoutItemType[][];
  name: string;
  permissions?: InteractionPermission[];
  uuid: string;
  variables?: {
    [variable: string]: BlockInteractionVariableType;
  };
}

export interface PipelineInteractionLayoutItem {
  block_uuid: string;
  interaction: string;
} & InteractionLayoutItemType;

export default interface PipelineInteractionType {
  interactions: {
    [blockUUID: string]: BlockInteractionType[];
  };
  layout: PipelineInteractionLayoutItem[][];
  permissions?: InteractionPermission[];
}
