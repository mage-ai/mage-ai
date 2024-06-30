import { AxiosError } from 'axios';
import { ErrorDetailsType } from '@interfaces/ErrorsType';
import { OperationTypeEnum } from './constants';
import { MutationStatusEnum } from './enums';
import { ClientEventType } from '@mana/shared/interfaces';

// "message": "Request failed with status code 400",
// "name": "AxiosError",
// "config": {
//   "transitional": {
//     "silentJSONParsing": true,
//     "forcedJSONParsing": true,
//     "clarifyTimeoutError": false
//   },
//   "transformRequest": [
//     null
//   ],
//   "transformResponse": [
//     null
//   ],
//   "timeout": 0,
//   "xsrfCookieName": "XSRF-TOKEN",
//   "xsrfHeaderName": "X-XSRF-TOKEN",
//   "maxContentLength": -1,
//   "maxBodyLength": -1,
//   "env": {
//     "FormData": null
//   },
//   "headers": {
//     "Accept": "application/json, text/plain, */*",
//     "Content-Type": "application/json"
//   },
//   "data": "{\"browser_item\":{\"content\":\"test:\\n  object_type: pipeline\\n  object_uuid: test\\n  project: memory_upgrade_v2\\n  repo_path: /home/src/default_repo/mlops/mlops/memory_upgrade_v2\\n\",\"path\":\"/home/src/default_repo/mlops/mlops/memory_upgrade_v2/global_data_products.yaml111111111111111111111\"},\"api_key\":\"zkWlN0PkIKSN0C11CfUHUj84OT5XOJ6tDZ6bDRO2\"}",
//   "method": "put",
//   "onDownloadProgress": null,
//   "onUploadProgress": null,
//   "responseType": "json",
//   "url": "http://localhost:6789/api/browser_items/%2Fhome%2Fsrc%2Fdefault_repo%2Fmlops%2Fmlops%2Fmemory_upgrade_v2%2Fglobal_data_products.yaml?api_key=zkWlN0PkIKSN0C11CfUHUj84OT5XOJ6tDZ6bDRO2"
// },
// "code": "ERR_BAD_REQUEST",
// "status": 400
export type AxiosErrorType = {
  response: {
    data: { error: ErrorDetailsType } | Record<string, any>;
  };
} & AxiosError;

export type ResourceType = Record<string, any>;

export type ResponseType = {
  data?: Record<string, ResourceType>;
  metadata?: Record<string, any>;
};

export type ErrorResponseType = {
  error?: ErrorDetailsType;
};

export type OnSuccessHandlerType = (
  response: any | ResponseType,
  variables?: any,
  context?: any,
) => Promise<unknown> | unknown;

export type OnErrorHandlerType = (
  err: any,
  variables?: any,
  context?: any,
) => Promise<unknown> | unknown;

export type OnStartHandlerType = () => void;

export interface HandlersType {
  onError?: OnErrorHandlerType;
  onSuccess?: OnSuccessHandlerType;
  onStart?: OnStartHandlerType;
}

export type MutationFetchArgumentsType = HandlersType | any;

export interface ResourceHandlersType {
  create?: HandlersType;
  delete?: HandlersType;
  detail?: HandlersType;
  list?: HandlersType;
  update?: HandlersType;
}

export type IDArgsType = {
  id?: string;
  idParent?: string;
  resource?: string;
  resourceParent?: string;
};

export type ArgsValueOrFunctionType = Record<string, any> | ((args: Record<string, any>) => Record<string, any>);

export type MutateFunctionArgsType = {
  event?: ClientEventType | any;
  meta?: ArgsValueOrFunctionType;
  payload?: ArgsValueOrFunctionType;
  query?: ArgsValueOrFunctionType;
} & IDArgsType & HandlersType;

export type MutateFunctionType = (args?: MutateFunctionArgsType) => Promise<ResourceType | ResourceType[]>;

export type MutatationType = {
  data: any;
  error: any;
  isError: boolean;
  isIdle: boolean;
  isLoading: boolean;
  isPaused: boolean;
  isSuccess: boolean;
  failureCount: number;
  failureReason: any;
  mutate: MutateFunctionType;
  mutateAsync: MutateFunctionType;
  reset: any;
  status: any;
};

export type ModelsType = Record<string, any | any[]>;

export type MutationStatusMappingType = {
  [OperationTypeEnum.CREATE]: MutationStatusEnum;
  [OperationTypeEnum.DELETE]: MutationStatusEnum;
  [OperationTypeEnum.DETAIL]: MutationStatusEnum;
  [OperationTypeEnum.LIST]: MutationStatusEnum;
  [OperationTypeEnum.UPDATE]: MutationStatusEnum;
};

export interface MutateType {
  create: MutatationType;
  delete: MutatationType;
  detail: MutatationType;
  list: MutatationType;
  modelsRef: React.MutableRefObject<ModelsType>;
  setModel: (model: ResourceType | ((prev: ResourceType) => ResourceType)) => ResourceType;
  setModels: (models: ResourceType[] | ((prev: ResourceType[]) => ResourceType[])) => ResourceType[];
  status: MutationStatusMappingType;
  update: MutatationType;
}

export interface URLOptionsType {
  disableEncodeURIComponent?: boolean;
  disableHyphenCase?: boolean;
}
