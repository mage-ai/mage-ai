import * as osPath from 'path';

import BlockType, {
  ALL_BLOCK_TYPES,
  BlockTypeEnum,
  BLOCK_TYPES,
  DRAGGABLE_BLOCK_TYPES,
  YAML_BLOCK_TYPES,
  R_BLOCK_TYPES,
  SQL_BLOCK_TYPES,
} from '@interfaces/BlockType';
import FileType, {
  ALL_SUPPORTED_FILE_EXTENSIONS_REGEX,
  METADATA_FILENAME,
  FileExtensionEnum,
  FOLDER_NAME_PIPELINES,
  FILE_EXTENSION_TO_LANGUAGE_MAPPING_REVERSE,
  FILE_EXTENSION_TO_LANGUAGE_MAPPING,
  FILE_EXTENSION_PRIORITY,
  FILE_EXTENSION_DISPLAY_MAPPING,
  CODE_BLOCK_FILE_EXTENSIONS,
} from '@interfaces/FileType';
import { groupBy, prependArray, removeAtIndex, sortByKey } from '@utils/array';
import { getBlockType } from '@components/FileEditor/utils';
import { cleanName, singularize } from '@utils/string';

export function getFullPath(
  file: FileType,
  currentPathInit: string = null,
  removeFilename: boolean = false,
): string {
  const currentPath = currentPathInit || (removeFilename ? null : file?.name);

  if (file?.parent) {
    const parts = [file.parent.name];
    if (currentPath?.length >= 1) {
      parts.push(currentPath);
    }
    return getFullPath(file.parent, parts.join(osPath.sep));
  }

  return currentPath;
}

export function removeRootFromFilePath(filePath: string): string {
  return filePath?.split(osPath.sep).slice(1).join(osPath.sep);
}

export function getFullPathWithoutRootFolder(
  file: FileType,
  currentPathInit: string = null,
  removeFilename: boolean = false,
): string {
  const fullPath = getFullPath(file, currentPathInit, removeFilename);

  return removeRootFromFilePath(fullPath);
}

export function getFileExtension(filename: string): FileExtensionEnum {
  const match = filename?.match(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX);
  return match?.length >= 1
    ? match[0].replace('.', '') as FileExtensionEnum
    : null;
}

export function validBlockFileExtension(filename: string): string {
  const extensions = [
    `\\.${FileExtensionEnum.MD}`,
    `\\.${FileExtensionEnum.PY}`,
    `\\.${FileExtensionEnum.R}`,
    `\\.${FileExtensionEnum.SQL}`,
    `\\.${FileExtensionEnum.YAML}`,
    `\\.${FileExtensionEnum.YML}`,
  ].join('|');
  const extensionRegex = new RegExp(`${extensions}$`);

  const match = filename.match(extensionRegex);

  return match?.length >= 1 ? match[0].replace('.', '') : null;
}

export function validBlockFromFilename(filename: string, blockType: BlockTypeEnum): boolean {
  const fileExtension = validBlockFileExtension(filename);

  return ![
    '__init__.py',
  ].includes(filename) && (
    BlockTypeEnum.DBT !== blockType || ![
      FileExtensionEnum.YAML,
      FileExtensionEnum.YML,
      // @ts-ignore
    ].includes(fileExtension)
  );
}

export function getBlockFromFile(
  file: FileType,
  currentPathInit: string = null,
  draggableBlockTypesOnly: boolean = false,
) {
  // parts example:
  // ['default_repo', 'data_loaders', 'team', 'foo.py']
  const parts = getFullPath(file, currentPathInit).split(osPath.sep);

  if (!parts) {
    return null;
  }

  const blockType = getBlockType(parts);

  if (!parts) {
    return null;
  }

  let fileName = '';
  if (parts.length >= 3) {
    // ['default_repo', 'data_loaders', 'team', 'foo.py'] becomes
    // team/foo.py
    fileName = parts.slice(2, parts.length).join(osPath.sep);
  } else {
    fileName = parts[parts.length - 1];
  }

  const blockTypesToInclude = draggableBlockTypesOnly ? DRAGGABLE_BLOCK_TYPES : BLOCK_TYPES;
  if (blockTypesToInclude.includes(blockType) && validBlockFileExtension(fileName)) {
    const idx = fileName.lastIndexOf('.');
    const extension = fileName.slice(idx + 1);

    return {
      language: FILE_EXTENSION_TO_LANGUAGE_MAPPING[extension],
      type: blockType,
      uuid: fileName.slice(0, idx),
    };
  }
}

export function getNonPythonBlockFromFile(
  file: FileType,
  currentPathInit: string = null,
): BlockType {
  const parts = getFullPath(file, currentPathInit).split(osPath.sep);
  if (!parts[1]) {
    return;
  }
  let blockType: BlockTypeEnum = singularize(parts[currentPathInit ? 0 : 1]);
  if (parts[1] === BlockTypeEnum.DBT) {
    blockType = BlockTypeEnum.DBT;
  }
  const fileName = parts[parts.length - 1];

  const yamlRegex = new RegExp(`\.${FileExtensionEnum.YAML}$`);
  const rRegex = new RegExp(`\.${FileExtensionEnum.R}$`);
  const sqlRegex = new RegExp(`\.${FileExtensionEnum.SQL}$`);
  const mdRegex = new RegExp(`\.${FileExtensionEnum.MD}$`);
  if (fileName.match(yamlRegex) && YAML_BLOCK_TYPES.includes(blockType)) {
    return {
      type: blockType,
      uuid: fileName.replace(yamlRegex, ''),
    };
  } else if (fileName.match(rRegex) && R_BLOCK_TYPES.includes(blockType)) {
    return {
      type: blockType,
      uuid: fileName.replace(rRegex, ''),
    };
  } else if (fileName.match(sqlRegex) && SQL_BLOCK_TYPES.includes(blockType)) {
    const formattedFilename = fileName.replace(/[.]/g, '_');
    const blockUUID = blockType === BlockTypeEnum.DBT
      ? parts.slice(2, -1).join('_').concat(`_${formattedFilename}`)
      : fileName.replace(sqlRegex, '');

    return {
      type: blockType,
      uuid: blockUUID,
    };
  } else if (fileName.match(mdRegex) && blockType === BlockTypeEnum.MARKDOWN) {
    return {
      type: blockType,
      uuid: fileName.replace(mdRegex, ''),
    };
  }
}

export function getBlockUUIDFromFile(
  file: FileType,
) {
  const filename = file.name;
  const nameParts = filename.split('.');
  const fileExtension = nameParts[nameParts.length - 1] as FileExtensionEnum;
  if (CODE_BLOCK_FILE_EXTENSIONS.includes(fileExtension)) {
    nameParts.pop();
  }

  return nameParts.join('');
}

export function rearrangePipelinesFolderToTop(
  files: FileType[],
) {
  const pipelinesFolder = files.find(f => f.name === FOLDER_NAME_PIPELINES);
  const pipelinesFolderIdx = files.findIndex(f => f.name === FOLDER_NAME_PIPELINES);
  const rearrangedFiles = prependArray(
    pipelinesFolder,
    removeAtIndex(files, pipelinesFolderIdx),
  );

  return rearrangedFiles;
}

export function replacePipelinesFolderWithConfig(
  files: FileType[] = [],
  currentPipelineName: string,
) {
  const pipelinesFolder = files?.find(f => f.name === FOLDER_NAME_PIPELINES);
  const currentPipelineFolder = pipelinesFolder?.children?.find(f => f.name === currentPipelineName);
  const metadataFile = currentPipelineFolder?.children?.find(f => f.name === METADATA_FILENAME);
  const configFolder = {
    children: [metadataFile],
    name: 'config',
  };
  const pipelinesFolderIdx = files?.findIndex(f => f.name === FOLDER_NAME_PIPELINES);
  const filesWithChildren = [];
  const filesWithoutChildren = [];
  removeAtIndex(files, pipelinesFolderIdx).forEach(f => {
    if (!f.children) {
      filesWithoutChildren.push(f);
    } else {
      filesWithChildren.push(f);
    }
  });

  return [configFolder]
    .concat(filesWithChildren)
    .concat(filesWithoutChildren);
}

export function getBlockFromFilePath(filePath: string, blocks: BlockType[]) {
  // data_loaders/[uuid].[extension]

  const nameParts = filePath.split('.');
  const fileExtension = nameParts[nameParts.length - 1] as FileExtensionEnum;
  if (CODE_BLOCK_FILE_EXTENSIONS.includes(fileExtension)) {
    nameParts.pop();
  }

  const parts = nameParts.join('').split(osPath.sep);
  const blockUUID = parts.slice(1, parts.length).join('');

  return blocks.find(({ uuid }: BlockType) => uuid === blockUUID);
}

export function getRelativePathFromBlock(block: BlockType) {
  // Block name, language, and type are required.
  const { language, name, type } = block || {};
  if (name && language && type) {
    const blockDirectory = type === BlockTypeEnum.CUSTOM
      ? type
      : `${type}s`;
    const fileExtension = FILE_EXTENSION_TO_LANGUAGE_MAPPING_REVERSE[language];
    const uuid = cleanName(name);

    return `${blockDirectory}/${uuid}.${fileExtension}`;
  }
}

export function groupByCommonDirectories(arr) {
  const groupsWith1Directory = {};
  const group1Roots = [];

  const groupsWith2Directories = {};
  const group2Roots = [];

  arr?.forEach((filePath) => {
    const parts = filePath?.split(osPath.sep)?.slice(1);
    const count = parts?.length || 0;

    const parts1 = parts?.slice(0, count - 2);
    const parts2 = parts?.slice(0, count - 3);

    const key1 = parts1?.join(osPath.sep);
    const key2 = parts2?.join(osPath.sep);

    groupsWith1Directory[key1] = groupsWith1Directory[key1] || [];
    groupsWith2Directories[key2] = groupsWith2Directories[key2] || [];

    if (!parts1?.length) {
      group1Roots.push(filePath)
    } else {
      groupsWith1Directory[key1].push(filePath);
    }

    if (!parts2?.length) {
      group2Roots.push(filePath);
    } else {
      groupsWith2Directories[key2].push(filePath);
    };
  });

  return {
    groupsWith1Directory,
    groupsWith2Directories,
  };
}

function groupByFileExtension(files: FileType[]): {
  [language: string]: FileType[];
} {
  return groupBy(files, ({ path }) => getFileExtension(path));
}

export function buildFileTreeByExtension(files: FileType[]): FileType[] {
  return sortByKey(
    Object.entries(groupByFileExtension(files || []) || {}),
    ([fx]) => FILE_EXTENSION_PRIORITY[fx],
  )
  .reduce((acc, [fx, files]) => {
    const parent = {
      extension: fx,
      language: FILE_EXTENSION_TO_LANGUAGE_MAPPING[fx],
      name: FILE_EXTENSION_DISPLAY_MAPPING[fx],
    };

    return acc.concat({
      ...parent,
      children: sortByKey(files, 'name').map(file => ({
        ...file,
        parent,
      })),
    })
  }, []);
}
