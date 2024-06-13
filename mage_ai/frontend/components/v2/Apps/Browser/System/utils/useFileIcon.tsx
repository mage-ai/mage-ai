import { useMemo } from 'react';
import {
  validBlockFileExtension,
  getFullPathWithoutRootFolder,
  validBlockFromFilename,
} from '@utils/files';

import {
  Circle,
  FileIcon,
  Charts,
  Ellipsis,
  FileFill,
  FolderIcon,
  Logs,
  Pipeline,
  PipelineV3,
} from '@mana/icons';
import {
  BLOCK_TYPE_ICON_MAPPING,
  FILE_EXTENSION_ICON_MAPPING,
  FILE_EXTENSION_COLOR_MAPPING,
} from '../constants';

import { getBlockColor } from '@mana/themes/blocks';
import FileType, { FOLDER_NAME_CHARTS, FOLDER_NAME_PIPELINES } from '@interfaces/FileType';
import { ALL_BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';

import { getFileExtension, getFullPath } from '../utils';
import { singularize } from '@utils/string';

type UseFileIconProps = {
  allowEmptyFolders?: boolean;
  children?: any;
  defaultColor?: string;
  filePathToUse?: string;
  disabled?: boolean;
  file?: FileType;
  filePath?: string;
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
  allowEmptyFolders,
  children,
  disabled: disabledProp,
  file,
  filePath,
  isFolder: isFolderProp,
  isInPipelinesFolder,
  isFileDisabled,
  isNotFolder,
  filePathToUse,
  name,
  theme,
  useRootFolder,
  uuid,
}: UseFileIconProps) {
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
    () => (folderNameForBlock ? getBlockColor?.(blockType, { theme })?.accent : null),
    [blockType, folderNameForBlock, theme],
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
    let iconColorInner = null;
    let IconInner = FileIcon || FileFill;

    const { extension } = file || { extension: null };

    if (!isFolder && isNotFolder) {
      IconInner = Ellipsis;
    } else if (isPipelineFolder) {
      IconInner = PipelineV3;
    } else if (name === FOLDER_NAME_CHARTS) {
      IconInner = Charts;
    } else if (isFolder && !extension) {
      if (isFirstParentFolderForBlock) {
        IconInner = BLOCK_TYPE_ICON_MAPPING?.[blockType] || FolderIcon;
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
      if (fx && fx in FILE_EXTENSION_ICON_MAPPING) {
        IconInner = FILE_EXTENSION_ICON_MAPPING[fx];
        iconColorInner = FILE_EXTENSION_COLOR_MAPPING[fx] || 'gray';
      }
    }

    return {
      Icon: IconInner,
      iconColor: iconColorInner,
    };
  }, [
    allowEmptyFolders,
    blockType,
    file,
    isPipelineFolder,
    isFirstParentFolderForBlock,
    isFolder,
    isNotFolder,
    isInPipelinesFolder,
    name,
  ]);

  const BlockIcon = useMemo(() => {
    let BlockIconInner = Circle;
    if (BlockTypeEnum.CHART === blockType) {
      BlockIconInner = Charts;
    }

    return BlockIconInner;
  }, [blockType]);

  return {
    BlockIcon,
    Icon,
    color,
    folderNameForBlock,
    iconColor,
    isBlockFile,
    isFirstParentFolderForBlock,
  };
}
