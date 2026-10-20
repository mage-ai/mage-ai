export enum ExtensionTypeEnum {
  DBT = 'dbt',
  GREAT_EXPECTATIONS = 'great_expectations',
}

export interface ExtensionOptionTemplateType {
  description: string;
  name: string;
  path: string;
  uuid: string;
}

export default interface ExtensionOptionType {
  description: string;
  name: string;
  templates: ExtensionOptionTemplateType[];
  uuid: string;
}
