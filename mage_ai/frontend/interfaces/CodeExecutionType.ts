export enum EnvironmentTypeEnum {
  CODE = 'code',
  PIPELINE = 'pipeline',
}

export enum EnvironmentUUIDEnum  {
  EXECUTION = 'execution',
}

export interface EnvironmentType {
  environment_variables?: Record<string, string>;
  type: EnvironmentTypeEnum;
  uuid: string | EnvironmentUUIDEnum;
  variables?: Record<string, string>;
}
