export enum OperationTypeEnum {
  ALL = 'all',
  CREATE = 'create',
  DELETE = 'delete',
  DETAIL = 'detail',
  LIST = 'list',
  UPDATE = 'update',
}

export enum ResourceTypeEnum {
  PIPELINE = 'pipeline',
  PIPELINE_SCHEDULE = 'pipeline_schedule',
}

export enum PageComponentCategoryEnum {
  BUTTON = 'button',
  FORM = 'form',
}

export default interface PageComponentType {
  category?: PageComponentCategoryEnum;
  components?: PageComponentType[];
  disabled: boolean;
  enabled: boolean;
  metadata?: {
    [key: string]: any;
  };
  operation?: OperationTypeEnum;
  parent?: PageComponentType;
  resource?: ResourceTypeEnum
  uuid: string;
  version?: number | string;
}
