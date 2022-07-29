export enum GroupEnum {
  DATA_EXPORTER = 'data_exporter',
  DATA_LOADER = 'data_loader',
  MAGE_LIBRARY = 'mage_library',
  TRANSFORMER = 'transformer',
  USER_LIBRARY = 'user_library',
}

export default interface AutocompleteItemType {
  classes: string[];
  constants: string[];
  files: string[];
  functions: string[];
  group: GroupEnum;
  id: string;
}
