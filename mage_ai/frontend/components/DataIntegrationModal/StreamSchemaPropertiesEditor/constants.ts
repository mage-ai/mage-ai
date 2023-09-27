export enum InputTypeEnum {
  CHECKBOX = 'checkbox',
  CUSTOM = 'custom',
}

export interface AttributeType {
  inputType: InputTypeEnum;
  label: () => string;
  uuid: AttributeUUIDEnum;
}
