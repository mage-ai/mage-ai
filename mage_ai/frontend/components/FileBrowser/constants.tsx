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
  [FileExtensionEnum.CSV]: '#C7CDDA',
  [FileExtensionEnum.JSON]: '#6B50D7',
  [FileExtensionEnum.MD]: '#9B6CA7',
  [FileExtensionEnum.PY]: '#FFE873',
  [FileExtensionEnum.R]: '#FF144D',
  [FileExtensionEnum.SH]: '#CBFE00',
  [FileExtensionEnum.SQL]: '#00758F',
  [FileExtensionEnum.TXT]: '#C7CDDA',
  [FileExtensionEnum.YAML]: '#95ECE2',
  [FileExtensionEnum.YML]: '#95ECE2',
};
