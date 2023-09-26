export enum AttributeUUIDEnum {
  BOOKMARK_PROPERTIES = 'bookmark_properties',
  KEY_PROPERTIES = 'key_properties',
  PARTITION_KEYS = 'partition_keys',
  UNIQUE_CONSTRAINTS = 'unique_constraints',
}

export enum InputTypeEnum {
  CHECKBOX = 'checkbox',
  CUSTOM = 'custom',
}

export interface AttributeType {
  inputType: InputTypeEnum;
  label: () => string;
  uuid: AttributeUUIDEnum;
}
