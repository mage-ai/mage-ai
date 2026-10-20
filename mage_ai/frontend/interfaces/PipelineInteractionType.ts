import InteractionType, {
  InteractionLayoutItemType,
  InteractionVariableTypeEnum,
} from './InteractionType';
import { ScheduleIntervalEnum, ScheduleTypeEnum } from './PipelineScheduleType';
import { RoleFromServerEnum } from '@interfaces/UserType';

export interface BlockInteractionTriggerType {
  schedule_interval?: ScheduleIntervalEnum;
  schedule_type?: ScheduleTypeEnum;
}

export interface BlockInteractionTriggerWithUUIDType {
  schedule_interval?: ScheduleIntervalEnum;
  schedule_type?: ScheduleTypeEnum;
  uuid: string | number;
};

export interface BlockInteractionRoleWithUUIDType {
  role?: RoleFromServerEnum;
  uuid: string;
};

export interface BlockInteractionVariableType {
  disabled?: boolean;
  required?: boolean;
  types?: InteractionVariableTypeEnum[];
  uuid_override?: string;
}

export interface InteractionPermission {
  roles?: RoleFromServerEnum[];
  triggers?: BlockInteractionTriggerType[];
}

export interface InteractionPermissionWithUUID {
  roles?: BlockInteractionRoleWithUUIDType[];
  triggers?: BlockInteractionTriggerWithUUIDType[];
  uuid: string;
}

export interface BlockInteractionType {
  description?: string;
  layout?: InteractionLayoutItemType[][];
  name?: string;
  permissions?: InteractionPermission[];
  uuid?: string;
  variables?: {
    [variable: string]: BlockInteractionVariableType;
  };
}

export interface PipelineInteractionLayoutItem {
  block_uuid: string;
  interaction: string;
  max_width_percentage?: number;
  variable?: string;
  width?: number;
};

export default interface PipelineInteractionType {
  blocks: {
    [blockUUID: string]: BlockInteractionType[];
  };
  interactions?: {
    [interactionUUID: string]: InteractionType;
  };
  layout: PipelineInteractionLayoutItem[][];
  permissions?: InteractionPermission[] | InteractionPermissionWithUUID[];
}
