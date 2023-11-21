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

interface HookStatusType {
  error: string;
  strategy: HookStrategyEnum;
}

interface HookRunSettingsType {
  with_trigger?: boolean;
}

interface HookPredicateType {
  resource: {
    [key: string]: string | number | boolean;
  };
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
  predicates?: HookPredicateType[][]
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
