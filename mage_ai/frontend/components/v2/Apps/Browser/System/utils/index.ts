import * as osPath from 'path';

import { FileIcon } from '@mana/icons';
import useFileIconBase from '@components/FileBrowser/Folder/useFileIcon';
import { ALL_SUPPORTED_FILE_EXTENSIONS_REGEX, FileExtensionEnum } from '@interfaces/FileType';
import {
  BLOCK_TYPE_ICON_MAPPING,
  FILE_EXTENSION_ICON_MAPPING,
  FILE_EXTENSION_COLOR_MAPPING,
  Icons,
} from '../constants';
import { ItemDetailType, ItemType } from '../interfaces';
import { ItemTypeEnum } from '../enums';
import { getBlockColor } from '@mana/themes/blocks';
import { selectKeys } from '@utils/hash';

export function useFileIcon(args) {
  return useFileIconBase({
    ...args,
    BlockIcons: BLOCK_TYPE_ICON_MAPPING,
    DefaultIcon: FileIcon,
    ExtensionIcons: FILE_EXTENSION_ICON_MAPPING,
    IconColors: FILE_EXTENSION_COLOR_MAPPING,
    Icons,
    defaultColor: 'gray',
    getBlockColor,
  });
}

export function getFullPath(item: ItemDetailType): string {
  if (!item.parent) {
    return item.name;
  }

  return `${getFullPath(item.parent)}${osPath.sep}${item.name}`;
}

export function getFileExtension(filename: string): FileExtensionEnum {
  const match = filename?.match(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX);
  return match?.length >= 1 ? (match[0].replace('.', '') as FileExtensionEnum) : null;
}

export function getIconColorName(name: string): string {
  return FILE_EXTENSION_COLOR_MAPPING[getFileExtension(name)] || 'gray';
}
