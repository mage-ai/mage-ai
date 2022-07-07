export enum FileExtensionEnum {
  PY = 'py',
  TXT = 'txt',
}

export default interface FileType {
  content: string;
  name: string;
  path: string;
}
