export enum ConfigurationTypeEnum {
  DBT = 'dbt',
}

export enum OptionTypeEnum {
  PROFILES = 'profiles',
  PROJECTS = 'projects',
  TARGETS = 'targets',
}

export enum ResourceTypeEnum {
  Block = 'Block'
}

export default interface ConfigurationOptionType {
  configuration_type: ConfigurationTypeEnum;
  option: any;
  option_type: OptionTypeEnum;
  resource_type: ResourceTypeEnum;
  uuid: string;
}
