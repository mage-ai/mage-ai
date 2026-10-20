import PipelineType from './PipelineType';

enum HookOperationEnum {
  CREATE = 'create',
  DELETE = 'delete',
  DETAIL = 'detail',
  EXECUTE = 'execute',
  LIST = 'list',
  UPDATE = 'update',
  UPDATE_ANYWHERE = 'update_anywhere',
}

export enum HookStrategyEnum {
  BREAK = 'break',
  CONTINUE = 'continue',
  RAISE = 'raise',
}

export enum HookStageEnum {
  AFTER = 'after',
  BEFORE = 'before',
}

export enum HookOutputKeyEnum {
  ERROR = 'error',
  META = 'meta',
  METADATA = 'metadata',
  PAYLOAD = 'payload',
  QUERY = 'query',
  RESOURCE = 'resource',
  RESOURCES = 'resources',
}

export enum HookConditionEnum {
  FAILURE = 'failure',
  SUCCESS = 'success',
}

export enum PredicateAndOrOperatorEnum {
  AND = 'and',
  OR = 'or',
}

export enum PredicateObjectTypeEnum {
  ERROR = 'error',
  HOOK = 'hook',
  META = 'meta',
  METADATA = 'metadata',
  OPERATION_RESOURCE = 'operation_resource',
  PAYLOAD = 'payload',
  QUERY = 'query',
  RESOURCE = 'resource',
  RESOURCES = 'resources',
  RESOURCE_ID = 'resource_id',
  RESOURCE_PARENT = 'resource_parent',
  RESOURCE_PARENT_ID = 'resource_parent_id',
  RESOURCE_PARENT_TYPE = 'resource_parent_type',
  USER = 'user',
}

export enum PredicateValueDataTypeEnum {
  BOOLEAN = 'BOOLEAN',
  DICTIONARY = 'DICTIONARY',
  FLOAT = 'FLOAT',
  INTEGER = 'INTEGER',
  LIST = 'LIST',
  STRING = 'STRING',
}

export enum PredicateOperatorEnum {
  EQUALS = 'EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_OR_EQUALS = 'GREATER_THAN_OR_EQUALS',
  INCLUDES = 'INCLUDES',
  LESS_THAN = 'LESS_THAN',
  LESS_THAN_OR_EQUALS = 'LESS_THAN_OR_EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  NOT_INCLUDES = 'NOT_INCLUDES',
  NOT_PRESENT = 'NOT_PRESENT',
  PRESENT = 'PRESENT',
}

export const OPERATORS_WITHOUT_RIGHT = [
  PredicateOperatorEnum.NOT_PRESENT,
  PredicateOperatorEnum.PRESENT,
];

export const OPERATOR_LABEL_MAPPING = {
  [PredicateOperatorEnum.EQUALS]: '==',
  [PredicateOperatorEnum.GREATER_THAN]: '>',
  [PredicateOperatorEnum.GREATER_THAN_OR_EQUALS]: '>=',
  [PredicateOperatorEnum.INCLUDES]: 'includes',
  [PredicateOperatorEnum.LESS_THAN]: '<',
  [PredicateOperatorEnum.LESS_THAN_OR_EQUALS]: '<=',
  [PredicateOperatorEnum.NOT_EQUALS]: '!=',
  [PredicateOperatorEnum.NOT_INCLUDES]: 'not includes',
  [PredicateOperatorEnum.NOT_PRESENT]: 'is not present',
  [PredicateOperatorEnum.PRESENT]: 'is present',
};

interface HookStatusType {
  error: string;
  strategy: HookStrategyEnum;
}

interface HookRunSettingsType {
  asynchronous?: boolean;
  with_trigger?: boolean;
}

interface PredicateValueBaseType {
  value_data_type: PredicateValueDataTypeEnum;
  value_type?: {
    value_data_type: PredicateValueDataTypeEnum;
    value_type?: any;
  };
}

export interface PredicateValueType extends PredicateValueBaseType {
  value_type?: PredicateValueBaseType;
}

interface HookPredicateBaseType {
  and_or_operator?: PredicateAndOrOperatorEnum;
  left_object_keys?: string[];
  left_object_type?: PredicateObjectTypeEnum;
  left_value?: boolean | number | string;
  left_value_type?: PredicateValueType;
  operator?: PredicateOperatorEnum;
  predicates?: any[];
  right_object_keys?: string[];
  right_object_type?: PredicateObjectTypeEnum;
  right_value?: boolean | number | string;
  right_value_type?: PredicateValueType;
}

export interface HookPredicateType extends HookPredicateBaseType {
  predicates?: HookPredicateBaseType[];
}

export interface HookOutputSettingsType {
  block: {
    uuid: string;
  };
  key: HookOutputKeyEnum;
  // Internal use only
  keyMore?: string;
  keys?: string[];
}

interface HookMetadataType {
  created_at: string;
  snapshot_hash?: string;
  snapshot_valid?: boolean;
  snapshotted_at?: string;
  updated_at: string;
  user: {
    id: number | string;
  };
}

export default interface GlobalHookType {
  conditions?: HookConditionEnum[];
  metadata?: HookMetadataType;
  operation_type: HookOperationEnum;
  operation_types?: HookOperationEnum[];
  outputs?: HookOutputSettingsType[];
  pipeline?: {
    uuid: string;
  };
  pipeline_details?: PipelineType;
  predicate?: HookPredicateType;
  resource_type: string;
  resource_types?: string[];
  run_settings?: HookRunSettingsType;
  stages?: HookStageEnum[];
  strategies?: HookStrategyEnum[];
  uuid: string;
}

interface GlobalHookResourceType {
  resource_type: string;
  create?: GlobalHookType[];
  delete?: GlobalHookType[];
  detail?: GlobalHookType[];
  execute?: GlobalHookType[];
  list?: GlobalHookType[];
  update?: GlobalHookType[];
  update_anywhere?: GlobalHookType[];
}

// The keys for this object map to the enum EntityName on the server.
interface GlobalHookResourcesType {
  [entityName: string]: GlobalHookResourceType;
}

interface GlobalHooksType {
  resources: GlobalHookResourcesType;
}
