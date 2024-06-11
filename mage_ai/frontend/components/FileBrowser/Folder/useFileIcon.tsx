import { useMemo } from 'react';

import Circle from '@oracle/elements/Circle';
import FileType, {
  ALL_SUPPORTED_FILE_EXTENSIONS_REGEX,
  FOLDER_NAME_CHARTS,
  FOLDER_NAME_PIPELINES,
  FileExtensionEnum,
  SUPPORTED_EDITABLE_FILE_EXTENSIONS_REGEX,
} from '@interfaces/FileType';
import { ALL_BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import { BLOCK_TYPE_ICON_MAPPING } from '@components/CustomTemplates/BrowseTemplates/constants';
import {
  Charts as ChartsOracle,
  Ellipsis as EllipsisOracle,
  FileFill as FileFillOracle,
  FolderV2Filled as FolderIconOracle,
  Logs as LogsOracle,
  Pipeline as PipelineOracle,
  PipelineV3 as PipelineV3Oracle,
} from '@oracle/icons';
import {
  FILE_EXTENSION_COLOR_MAPPING,
  FILE_EXTENSION_ICON_MAPPING,
} from '@components/FileBrowser/constants';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import {
  getFileExtension,
  getFullPath,
  getFullPathWithoutRootFolder,
  validBlockFileExtension,
  validBlockFromFilename,
} from '../utils';
import { singularize } from '@utils/string';

type UseFileIconProps = {
  BlockIcons?: {
    [uuid: string]: any;
  };
  DefaultIcon?: any;
  Icons?: {
    [uuid: string]: any;
  };
  IconColors?: {
    [uuid: string]: string;
  };
  ExtensionIcons?: {
    [uuid: string]: any;
  };
  allowEmptyFolders?: boolean;
  children?: any;
  defaultColor?: string;
  disabled?: boolean;
  file?: FileType;
  filePath?: string;
  getBlockColor?: (
    blockType: BlockTypeEnum,
    options: { theme: any },
  ) => { accent: string; accentDark?: string; accentLight?: string };
  isFolder?: boolean;
  isInPipelinesFolder?: boolean;
  isFileDisabled?: (filePath: string, children: FileType[]) => boolean;
  isNotFolder?: boolean;
  level?: number;
  name?: string;
  theme?: any;
  useRootFolder?: boolean;
  uuid?: string;
};

export default function useFileIcon({
  BlockIcons = BLOCK_TYPE_ICON_MAPPING,
  DefaultIcon,
  ExtensionIcons = FILE_EXTENSION_ICON_MAPPING,
  IconColors = FILE_EXTENSION_COLOR_MAPPING,
  Icons,
  allowEmptyFolders,
  children,
  defaultColor,
  disabled: disabledProp,
  file,
  filePath,
  getBlockColor,
  isFolder: isFolderProp,
  isInPipelinesFolder,
  isFileDisabled,
  isNotFolder,
  level,
  name,
  theme,
  useRootFolder,
  uuid,
}: UseFileIconProps) {
  const { Charts, Ellipsis, FileFill, FolderIcon, Logs, Pipeline, PipelineV3 } = Icons || {
    Charts: ChartsOracle,
    Ellipsis: EllipsisOracle,
    FileFill: FileFillOracle,
    FolderIcon: FolderIconOracle,
    Logs: LogsOracle,
    Pipeline: PipelineOracle,
    PipelineV3: PipelineV3Oracle,
  };

  const filePathToUse: string = useMemo(
    () =>
      filePath ? filePath : useRootFolder ? getFullPath(file) : getFullPathWithoutRootFolder(file),
    [file, filePath, useRootFolder],
  );

  const isFolder = useMemo(
    () => isFolderProp || (!!children && !isNotFolder),
    [children, isFolderProp, isNotFolder],
  );

  const folderNameForBlock = useMemo(
    () =>
      uuid?.split?.('/')?.find?.(key => {
        const keySingle = singularize(key);

        return keySingle in ALL_BLOCK_TYPES;
      }),
    [uuid],
  );
  const blockType = useMemo(
    () => (folderNameForBlock ? singularize(folderNameForBlock) : null),
    [folderNameForBlock],
  );
  const isFirstParentFolderForBlock = useMemo(
    () => isFolder && folderNameForBlock && folderNameForBlock === name,
    [folderNameForBlock, isFolder, name],
  );
  const isBlockFile = useMemo(
    () =>
      folderNameForBlock &&
      !isFolder &&
      validBlockFileExtension(name) &&
      validBlockFromFilename(name, blockType),
    [blockType, folderNameForBlock, isFolder, name],
  );

  const color = useMemo(
    () =>
      folderNameForBlock
        ? getBlockColor
          ? getBlockColor?.(blockType, { theme })?.accent
          : getColorsForBlockType(blockType, { theme }).accent
        : null,
    [blockType, getBlockColor, folderNameForBlock, theme],
  );

  const isPipelineFolder = name === FOLDER_NAME_PIPELINES;

  const disabled = useMemo(
    () =>
      isFileDisabled
        ? isFileDisabled(filePathToUse, children)
        : disabledProp ||
          (isInPipelinesFolder && name === '__init__.py') ||
          (folderNameForBlock && name === '__init__.py'),
    [
      children,
      disabledProp,
      ,
      filePathToUse,
      folderNameForBlock,
      isFileDisabled,
      isInPipelinesFolder,
      name,
    ],
  );

  const { Icon, iconColor } = useMemo(() => {
    let iconColorInner;
    let IconInner = DefaultIcon || FileFill;

    const { extension } = file || { extension: null };

    if (!isFolder && isNotFolder) {
      IconInner = Ellipsis;
    } else if (isPipelineFolder) {
      IconInner = PipelineV3;
    } else if (name === FOLDER_NAME_CHARTS) {
      IconInner = Charts;
    } else if (isFolder && !extension) {
      if (isFirstParentFolderForBlock) {
        IconInner = BlockIcons?.[blockType] || FolderIcon;
      } else {
        IconInner = FolderIcon;
      }
    } else if (!name && allowEmptyFolders) {
      IconInner = Ellipsis;
    } else if (isInPipelinesFolder && !isFolder && name === 'metadata.yaml') {
      IconInner = Pipeline;
    } else if (name?.includes('.log')) {
      IconInner = Logs;
    } else if (!isFolder || extension) {
      const fx = extension || getFileExtension(name);
      if (fx && fx in ExtensionIcons) {
        IconInner = ExtensionIcons[fx];
        iconColorInner = IconColors[fx] || defaultColor;
      }
    }

    return {
      Icon: IconInner,
      iconColor: iconColorInner,
    };
  }, [
    DefaultIcon,
    BlockIcons,
    Charts,
    Ellipsis,
    ExtensionIcons,
    FileFill,
    FolderIcon,
    IconColors,
    Logs,
    Pipeline,
    PipelineV3,
    isPipelineFolder,
    allowEmptyFolders,
    defaultColor,
    blockType,
    file,
    isFirstParentFolderForBlock,
    isFolder,
    isInPipelinesFolder,
    isNotFolder,
    name,
  ]);

  const BlockIcon = useMemo(() => {
    let BlockIconInner = Circle;
    if (BlockTypeEnum.CHART === blockType) {
      BlockIconInner = Charts;
    }

    return BlockIconInner;
  }, [Charts, blockType]);

  return {
    BlockIcon,
    Icon,
    blockType,
    color,
    disabled,
    filePathToUse,
    folderNameForBlock,
    iconColor,
    isBlockFile,
    isFirstParentFolderForBlock,
    isFolder,
    isPipelineFolder,
  };
}
