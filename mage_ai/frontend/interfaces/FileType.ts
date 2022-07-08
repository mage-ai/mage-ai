export enum FileExtensionEnum {
  PY = 'py',
  TXT = 'txt',
}

export default interface FileType {
  children: FileType[];
  content?: string;
  disabled?: boolean;
  name: string;
  parent?: FileType;
  path?: string;
}
