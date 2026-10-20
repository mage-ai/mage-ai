import * as osPath from 'path';

import { ALL_SUPPORTED_FILE_EXTENSIONS_REGEX, FileExtensionEnum } from '@interfaces/FileType';
import { FILE_EXTENSION_COLOR_MAPPING } from '../constants';
import { ItemDetailType } from '../interfaces';

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
