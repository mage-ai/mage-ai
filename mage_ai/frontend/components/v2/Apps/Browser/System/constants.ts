import icons from '@mana/icons';
import { FileExtensionEnum } from '@interfaces/FileType';

const {
  Alphabet,
  Charts,
  Code,
  Database,
  Ellipsis,
  File: FileIcon,
  FileFill,
  FolderIcon,
  Insights,
  Lightning,
  List,
  Logs,
  Pipeline,
  PipelineV3,
  Table,
  Terminal,
} = icons;

export const FILE_EXTENSION_ICON_MAPPING = {
  [FileExtensionEnum.CSV]: Table,
  [FileExtensionEnum.JSON]: Code,
  [FileExtensionEnum.MD]: FileIcon,
  [FileExtensionEnum.PY]: Lightning,
  [FileExtensionEnum.R]: Insights,
  [FileExtensionEnum.SH]: Terminal,
  [FileExtensionEnum.SQL]: Database,
  [FileExtensionEnum.TXT]: Alphabet,
  [FileExtensionEnum.YAML]: List,
  [FileExtensionEnum.YML]: List,
};

export const FILE_EXTENSION_COLOR_MAPPING = {
  [FileExtensionEnum.CSV]: 'blueHi',    // Light grayish blue
  [FileExtensionEnum.JSON]: 'purple',   // Medium purple
  [FileExtensionEnum.MD]: 'purpleHi',     // Medium lavender
  [FileExtensionEnum.PY]: 'yellowMd',     // Light yellow
  [FileExtensionEnum.R]: 'redHi',      // Bright red
  [FileExtensionEnum.SH]: 'greenHi',     // Lime green
  [FileExtensionEnum.SQL]: 'blueLo',    // Dark cyan
  [FileExtensionEnum.TXT]: 'blueMd',    // Light grayish blue
  [FileExtensionEnum.YAML]: 'greenMd',   // Pale teal
  [FileExtensionEnum.YML]: 'greenMd',    // Pale teal
};

export const Icons = {
  Charts,
  Ellipsis,
  FileFill,
  FolderV2Filled: FolderIcon,
  Logs,
  Pipeline,
  PipelineV3,
};
