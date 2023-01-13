import BlockType, {
  BlockTypeEnum,
  BLOCK_TYPES,
  YAML_BLOCK_TYPES,
  R_BLOCK_TYPES,
  SQL_BLOCK_TYPES,
} from '@interfaces/BlockType';
import FileType, {
  CODE_BLOCK_FILE_EXTENSIONS,
  FileExtensionEnum,
  FOLDER_NAME_PIPELINES,
  METADATA_FILENAME,
} from '@interfaces/FileType';
import { prependArray, removeAtIndex } from '@utils/array';
import { singularize } from '@utils/string';

export function getFullPath(
  file: FileType,
  currentPathInit: string = null,
): string {
  const currentPath = currentPathInit || file?.name;

  if (file?.parent) {
    return getFullPath(file.parent, `${file.parent.name}/${currentPath}`);
  }

  return currentPath;
}

export function removeRootFromFilePath(filePath: string): string {
  return filePath.split('/').slice(1).join('/');
}

export function getFullPathWithoutRootFolder(
  file: FileType,
  currentPathInit: string = null,
): string {
  const fullPath = getFullPath(file, currentPathInit);

  return removeRootFromFilePath(fullPath);
}

export function getBlockFromFile(
  file: FileType,
  currentPathInit: string = null,
) {
  // parts example:
  // ['default_repo', 'data_loaders', 'team', 'foo.py']
  const parts = getFullPath(file, currentPathInit).split('/');
  // This assumes path default_repo/[block_type]s/..
  const blockType = singularize(parts[1] || '');

  let fileName = '';
  if (parts.length >= 3) {
    // ['default_repo', 'data_loaders', 'team', 'foo.py'] becomes
    // team/foo.py
    fileName = parts.slice(2, parts.length).join('/');
  } else {
    fileName = parts[parts.length - 1];
  }

  const extensions = [
    `\.${FileExtensionEnum.PY}`,
    `\.${FileExtensionEnum.R}`,
    `\.${FileExtensionEnum.SQL}`,
    `\.${FileExtensionEnum.YAML}`,
    `\.${FileExtensionEnum.YML}`,
  ].join('|');
  const extensionRegex = new RegExp(`${extensions}$`);
  if (BLOCK_TYPES.includes(blockType) && fileName.match(extensionRegex)) {
    return {
      type: blockType,
      uuid: fileName.replace(extensionRegex, ''),
    };
  }
}

export function getNonPythonBlockFromFile(
  file: FileType,
  currentPathInit: string = null,
): BlockType {
  const parts = getFullPath(file, currentPathInit).split('/');
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
