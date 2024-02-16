import { BlockLanguageEnum } from './BlockType';

export enum BlockFolderNameEnum {
  DBT = 'dbt',
}

export enum FileExtensionEnum {
  CSV = 'csv',
  JSON = 'json',
  MD = 'md',
  PY = 'py',
  R = 'r',
  SH = 'sh',
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

export enum FileQueryEnum {
  EXCLUDE_DIR_PATTERN = 'exclude_dir_pattern',
  EXCLUDE_PATTERN = 'exclude_pattern',
  PATTERN = 'pattern',
}

export enum FileFilterEnum {
  ALL_FILES = 'all_files',
  UNUSED_BLOCK_FILES = 'unused_block_files',
}

// This is regex for matching nothing (to include all files, including hidden ones)
export const FILE_PATTERN_NO_MATCHES = 'a^';
// We exclude no files (e.g. hidden files) by matching no file patterns.
export const FILES_QUERY_INCLUDE_HIDDEN_FILES = {
  [FileQueryEnum.EXCLUDE_PATTERN]: FILE_PATTERN_NO_MATCHES,
  [FileQueryEnum.EXCLUDE_DIR_PATTERN]: FILE_PATTERN_NO_MATCHES,
};

export const CODE_BLOCK_FILE_EXTENSIONS = [
  FileExtensionEnum.PY,
  FileExtensionEnum.SQL,
];

export const PIPELINE_BLOCK_EXTENSIONS = [
  FileExtensionEnum.MD,
  FileExtensionEnum.PY,
  FileExtensionEnum.R,
  FileExtensionEnum.SQL,
  FileExtensionEnum.YAML,
];

const SUPPORTED_EDITABLE_FILE_EXTENSIONS = [
  FileExtensionEnum.JSON,
  FileExtensionEnum.MD,
  FileExtensionEnum.PY,
  FileExtensionEnum.R,
  FileExtensionEnum.SH,
  FileExtensionEnum.SQL,
  FileExtensionEnum.TXT,
  FileExtensionEnum.YAML,
  FileExtensionEnum.YML,
];

export const FILE_EXTENSION_PRIORITY = {
  [FileExtensionEnum.PY]: 0,
  [FileExtensionEnum.SQL]: 1,
  [FileExtensionEnum.R]: 2,
  [FileExtensionEnum.YAML]: 3,
  [FileExtensionEnum.YML]: 3,
  [FileExtensionEnum.MD]: 4,
  [FileExtensionEnum.TXT]: 5,
  [FileExtensionEnum.JSON]: 6,
  [FileExtensionEnum.CSV]: 7,
  [FileExtensionEnum.SH]: 8,
};

export const SUPPORTED_EDITABLE_FILE_EXTENSIONS_REGEX =
  new RegExp(SUPPORTED_EDITABLE_FILE_EXTENSIONS.map(ext => `\.${ext}$`).join('|'));

export const ALL_SUPPORTED_FILE_EXTENSIONS_REGEX = new RegExp([
  FileExtensionEnum.CSV,
  FileExtensionEnum.JSON,
  FileExtensionEnum.MD,
  FileExtensionEnum.PY,
  FileExtensionEnum.R,
  FileExtensionEnum.SH,
  FileExtensionEnum.SQL,
  FileExtensionEnum.TXT,
  FileExtensionEnum.YAML,
  FileExtensionEnum.YML,
].map(ext => `\.${ext}$`).join('|'));

export const COMMON_EXCLUDE_PATTERNS = new RegExp([
  '__init__\.py',
  'metadata\.yaml',
  'interactions\.yaml',
  '\.DS_Store',
].join('|'));

export const COMMON_EXCLUDE_DIR_PATTERNS = new RegExp([
  'compiled',
  '__pycache__',
].join('|'));

export default interface FileType {
  children?: FileType[];
  content?: string;
  disabled?: boolean;
  extension?: FileExtensionEnum;
  isNotFolder?: boolean;
  language?: BlockLanguageEnum;
  modified_timestamp?: number;
  pipeline_count?: number
  name?: string;
  parent?: FileType;
  path?: string;
  size?: number;
  uuid?: string;
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


export type OriginalContentMappingType = {
  [relativeFilePath: string]: {
    content: string;
    content_from_base: string;
    content_from_compare: string;
    filename: string;
    fullPath: string;
    relativePath: string;
    repoPath: string;
  };
};

export const FILE_EXTENSION_DISPLAY_MAPPING = {
  [FileExtensionEnum.CSV]: 'Comma-separated values',
  [FileExtensionEnum.JSON]: 'JSON',
  [FileExtensionEnum.MD]: 'Markdown',
  [FileExtensionEnum.PY]: 'Python',
  [FileExtensionEnum.R]: 'R',
  [FileExtensionEnum.SH]: 'Shell script',
  [FileExtensionEnum.SQL]: 'SQL',
  [FileExtensionEnum.TXT]: 'Text',
  [FileExtensionEnum.YAML]: 'YAML',
  [FileExtensionEnum.YML]: 'YAML',
};
