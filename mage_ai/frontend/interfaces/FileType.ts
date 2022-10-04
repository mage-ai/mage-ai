import { BlockLanguageEnum } from './BlockType';

export enum FileExtensionEnum {
  PY = 'py',
  SQL = 'sql',
  TXT = 'txt',
  YAML = 'yaml',
  YML = 'yml',
}

export enum SpecialFileEnum {
  INIT_PY = '__init__.py',
}

export const CODE_BLOCK_FILE_EXTENSIONS = [
  FileExtensionEnum.PY,
  FileExtensionEnum.SQL,
];

const SUPPORTED_FILE_EXTENSIONS = [
  FileExtensionEnum.SQL,
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
  name?: string;
  parent?: FileType;
  path?: string;
}

export const FOLDER_NAME_CHARTS = 'charts';
export const FOLDER_NAME_CONFIG = 'config';
export const FOLDER_NAME_PIPELINES = 'pipelines';
export const METADATA_FILENAME = 'metadata.yaml';
export const FILE_EXTENSION_TO_LANGUAGE_MAPPING = {
  [FileExtensionEnum.PY]: BlockLanguageEnum.PYTHON,
  [FileExtensionEnum.SQL]: BlockLanguageEnum.SQL,
  [FileExtensionEnum.TXT]: 'text',
  [FileExtensionEnum.YAML]: 'yaml',
  [FileExtensionEnum.YML]: 'yaml',
};
