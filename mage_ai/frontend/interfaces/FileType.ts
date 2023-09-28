import { BlockLanguageEnum } from './BlockType';

export enum FileExtensionEnum {
  CSV = 'csv',
  JSON = 'json',
  MD = 'md',
  PY = 'py',
  R = 'r',
  SQL = 'sql',
  TXT = 'txt',
  YAML = 'yaml',
  YML = 'yml',
}

export enum SpecialFileEnum {
  INIT_PY = '__init__.py',
  METADATA_YAML = 'metadata.yaml',
  REQS_TXT = 'requirements.txt',
}

export const CODE_BLOCK_FILE_EXTENSIONS = [
  FileExtensionEnum.PY,
  FileExtensionEnum.SQL,
];

const SUPPORTED_EDITABLE_FILE_EXTENSIONS = [
  FileExtensionEnum.JSON,
  FileExtensionEnum.MD,
  FileExtensionEnum.PY,
  FileExtensionEnum.R,
  FileExtensionEnum.SQL,
  FileExtensionEnum.TXT,
  FileExtensionEnum.YAML,
  FileExtensionEnum.YML,
];

export const SUPPORTED_EDITABLE_FILE_EXTENSIONS_REGEX =
  new RegExp(SUPPORTED_EDITABLE_FILE_EXTENSIONS.map(ext => `\.${ext}$`).join('|'));

export const ALL_SUPPORTED_FILE_EXTENSIONS_REGEX =
  new RegExp(SUPPORTED_EDITABLE_FILE_EXTENSIONS.map(ext => `\.${ext}$`).join('|'));

export default interface FileType {
  children?: FileType[];
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
  [FileExtensionEnum.MD]: BlockLanguageEnum.MARKDOWN,
  [FileExtensionEnum.JSON]: FileExtensionEnum.JSON,
  [FileExtensionEnum.PY]: BlockLanguageEnum.PYTHON,
  [FileExtensionEnum.R]: BlockLanguageEnum.R,
  [FileExtensionEnum.SQL]: BlockLanguageEnum.SQL,
  [FileExtensionEnum.TXT]: 'text',
  [FileExtensionEnum.YAML]: BlockLanguageEnum.YAML,
  [FileExtensionEnum.YML]: BlockLanguageEnum.YAML,
};
export const FILE_EXTENSION_TO_LANGUAGE_MAPPING_REVERSE = {
  [BlockLanguageEnum.MARKDOWN]: FileExtensionEnum.MD,
  [BlockLanguageEnum.PYTHON]: FileExtensionEnum.PY,
  [BlockLanguageEnum.R]: FileExtensionEnum.R,
  [BlockLanguageEnum.SQL]: FileExtensionEnum.SQL,
  [BlockLanguageEnum.YAML]: FileExtensionEnum.YAML,
  text: FileExtensionEnum.TXT,
};
