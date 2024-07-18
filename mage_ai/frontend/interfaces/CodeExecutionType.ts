import { ExecutionResultType } from './EventStreamType';

export enum EnvironmentTypeEnum {
  CODE = 'code',
  PIPELINE = 'pipeline',
}

export enum EnvironmentUUIDEnum {
  EXECUTION = 'execution',
}

export interface EnvironmentType {
  environment_variables?: Record<string, string>;
  type: EnvironmentTypeEnum;
  uuid: string | EnvironmentUUIDEnum;
  variables?: Record<string, string>;
}

export interface ExecutionOutputType {
  absolute_path: string;
  environment: EnvironmentType;
  messages: ExecutionResultType[];
  namespace: string;
  output: any;
  path: string;
  uuid: string;
}
