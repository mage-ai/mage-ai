import PageComponentType, {
  OperationTypeEnum,
  ResourceTypeEnum,
} from './PageComponentType';

export enum ClientPageCategoryEnum {
  COMMUNITY = 'community',
}

export enum ClientPageTypeEnum {
  DETAIL = 'detail',
  EDIT = 'edit',
  LIST = 'list',
  NEW = 'new',
}

export default interface ClientPageType {
  category?: ClientPageCategoryEnum;
  components?: PageComponentType[];
  disabled: boolean;
  enabled: boolean;
  metadata?: {
    [key: string]: any;
  };
  operation?: OperationTypeEnum;
  parent?: ClientPageType;
  resource?: ResourceTypeEnum
  uuid: string;
  version?: number | string;
}
