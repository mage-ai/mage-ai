import { InteractionLayoutItemType, InteractionVariableTypeEnum } from './InteractionType';
import { ScheduleTypeEnum } from './PipelineScheduleType';

export interface BlockInteractionTriggerType {
  schedule_interval?: string;
  schedule_type?: ScheduleTypeEnum;
}

export interface BlockInteractionVariableType; {
  disabled?: boolean;
  required?: boolean;
  types?: InteractionVariableTypeEnum[];
  uuid_override?: string;
}

export interface BlockInteractionType {
  layout?: InteractionLayoutItemType[][];
  name: string;
  roles?: string[];
  triggers?: BlockInteractionTriggerType[];
  uuid: string;
  variables?: {
    [variable: string]: BlockInteractionVariableType;
  };
}

export default interface PipelineInteractionType {
  interactions: {
    [blockUUID: string]: BlockInteractionType[];
  };
}
