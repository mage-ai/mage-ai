// Make sure this value is the same in mage_ai/settings/__init__.py
export const OAUTH2_APPLICATION_CLIENT_ID: string = 'zkWlN0PkIKSN0C11CfUHUj84OT5XOJ6tDZ6bDRO2';

export enum OperationTypeEnum {
  CREATE = 'create',
  DELETE = 'delete',
  DETAIL = 'detail',
  LIST = 'list',
  UPDATE = 'update',
}

export enum MetaQueryEnum {
  LIMIT = '_limit',
  OFFSET = '_offset',
  ORDER_BY = '_order_by[]',
}

export const META_QUERY_KEYS = [MetaQueryEnum.LIMIT, MetaQueryEnum.OFFSET, MetaQueryEnum.ORDER_BY];

export enum ResponseTypeEnum {
  BLOB = 'blob',
  JSON = 'json',
}
