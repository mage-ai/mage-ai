export type KeyMappingType = {
  [key: string]: boolean;
};

export default interface KeyboardShortcutType {
  keyHistory: number[];
  keyMapping: KeyMappingType;
}
