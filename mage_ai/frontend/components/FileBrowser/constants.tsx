import {
  Alphabet,
  Code,
  File as FileIcon,
  Insights,
  Lightning,
  Table,
  Database,
  Terminal,
  List,
} from '@oracle/icons';
import { FileExtensionEnum } from '@interfaces/FileType';

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
  [FileExtensionEnum.CSV]: '#C7CDDA', // Light grayish blue
  [FileExtensionEnum.JSON]: '#6B50D7', // Medium purple
  [FileExtensionEnum.MD]: '#9B6CA7', // Medium lavender
  [FileExtensionEnum.PY]: '#FFE873', // Light yellow
  [FileExtensionEnum.R]: '#FF144D', // Bright red
  [FileExtensionEnum.SH]: '#CBFE00', // Lime green
  [FileExtensionEnum.SQL]: '#00758F', // Dark cyan
  [FileExtensionEnum.TXT]: '#C7CDDA', // Light grayish blue
  [FileExtensionEnum.YAML]: '#95ECE2', // Pale teal
  [FileExtensionEnum.YML]: '#95ECE2', // Pale teal
};
