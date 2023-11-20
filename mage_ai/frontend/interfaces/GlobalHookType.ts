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

enum HookStrategyEnum {
  BREAK = 'break',
  CONTINUE = 'continue',
  RAISE = 'raise',
}

enum HookStageEnum {
  AFTER = 'after',
  BEFORE = 'before',
}

enum HookOutputKeyEnum {
  ERROR = 'error',
  META = 'meta',
  METADATA = 'metadata',
  PAYLOAD = 'payload',
  QUERY = 'query',
  RESOURCE = 'resource',
  RESOURCES = 'resources',
}

enum HookConditionEnum {
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

interface HookOutputSettingsType {
  block: {
    uuid: string;
  };
  key: HookOutputKeyEnum;
  keys?: string[];
}

export default interface GlobalHookType {
  conditions?: HookConditionEnum[];
  operation_type: HookOperationEnum;
  outputs?: HookOutputSettingsType[];
  pipeline?: {
    uuid: string;
  };
  pipeline_details?: PipelineType;
  predicates?: HookPredicateType[][]
  resource_type: string;
  run_settings?: HookRunSettingsType;
  stages?: HookStageEnum[];
  strategies?: HookStrategyEnum[];
  uuid: string;
}

interface GlobalHookResourceType {
  resource_type: string;
  create?: HookType[];
  delete?: HookType[];
  detail?: HookType[];
  execute?: HookType[];
  list?: HookType[];
  update?: HookType[];
  update_anywhere?: HookType[];
}

// The keys for this object map to the enum EntityName on the server.
interface GlobalHookResourcesType {
  [entityName: string]: GlobalHookResourceType;
}

interface GlobalHooksType {
  resources: GlobalHookResourcesType;
}
