import icons from '@mana/icons';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { FileExtensionEnum } from '@interfaces/FileType';

const {
  Alphabet,
  BlockGeneric,
  Callback,
  Charts,
  CircleWithArrowUp,
  Code,
  Conditional,
  CubeWithArrowDown,
  DBT,
  Database,
  Ellipsis,
  FileFill,
  FileIcon,
  FolderIcon,
  FrameBoxSelection,
  Insights,
  Lightning,
  List,
  Logs,
  Pipeline,
  PipelineV3,
  Sensor,
  Table,
  Terminal,
} = icons;

export const BLOCK_TYPE_ICON_MAPPING = {
  [BlockTypeEnum.CALLBACK]: Callback,
  [BlockTypeEnum.CHART]: Charts,
  [BlockTypeEnum.CONDITIONAL]: Conditional,
  [BlockTypeEnum.CUSTOM]: BlockGeneric,
  [BlockTypeEnum.DATA_EXPORTER]: CircleWithArrowUp,
  [BlockTypeEnum.DATA_LOADER]: CubeWithArrowDown,
  [BlockTypeEnum.DBT]: DBT,
  [BlockTypeEnum.EXTENSION]: Lightning,
  [BlockTypeEnum.MARKDOWN]: FileIcon,
  [BlockTypeEnum.SENSOR]: Sensor,
  [BlockTypeEnum.TRANSFORMER]: FrameBoxSelection,
};

export const FILE_EXTENSION_ICON_MAPPING = {
  [FileExtensionEnum.CSV]: Table,
  [FileExtensionEnum.JINJA]: FileIcon,
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
  [FileExtensionEnum.CSV]: 'blueHi', // Light grayish blue
  [FileExtensionEnum.JSON]: 'purple', // Medium purple
  [FileExtensionEnum.MD]: 'purpleHi', // Medium lavender
  [FileExtensionEnum.PY]: 'yellowMd', // Light yellow
  [FileExtensionEnum.R]: 'redHi', // Bright red
  [FileExtensionEnum.SH]: 'greenHi', // Lime green
  [FileExtensionEnum.SQL]: 'blueHi', // Dark cyan
  [FileExtensionEnum.TXT]: 'skyHi', // Light grayish blue
  [FileExtensionEnum.YAML]: 'green', // Pale teal
  [FileExtensionEnum.YML]: 'green', // Pale teal
};
