import PageComponentType, {
  OperationTypeEnum,
  ResourceTypeEnum,
} from './PageComponentType';

export enum ClientPageCategoryEnum {
  COMMUNITY = 'community',
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
