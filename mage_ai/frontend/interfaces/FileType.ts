export enum FileExtensionEnum {
  PY = 'py',
  TXT = 'txt',
  YAML = 'yaml',
  YML = 'yml',
}

const SUPPORTED_FILE_EXTENSIONS = [
  FileExtensionEnum.TXT,
  FileExtensionEnum.YAML,
  FileExtensionEnum.YML,
];

export const SUPPORTED_FILE_EXTENSIONS_REGEX =
  new RegExp(SUPPORTED_FILE_EXTENSIONS.map(ext => `\.${ext}$`).join('|'));

export default interface FileType {
  children: FileType[];
  content?: string;
  disabled?: boolean;
  name: string;
  parent?: FileType;
  path?: string;
}

export const FOLDER_NAME_PIPELINES = 'pipelines';
export const FILE_EXTENSION_TO_LANGUAGE_MAPPING = {
  [FileExtensionEnum.PY]: 'python',
  [FileExtensionEnum.TXT]: 'text',
  [FileExtensionEnum.YAML]: 'yaml',
  [FileExtensionEnum.YML]: 'yaml',
};
