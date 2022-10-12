import FileType, {
  CODE_BLOCK_FILE_EXTENSIONS,
  FileExtensionEnum,
  FOLDER_NAME_PIPELINES,
  METADATA_FILENAME,
} from '@interfaces/FileType';
import BlockType, {
  BLOCK_TYPES,
  YAML_BLOCK_TYPES,
} from '@interfaces/BlockType';
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

export function getFullPathWithoutRootFolder(
  file: FileType,
  currentPathInit: string = null,
): string {
  const fullPath = getFullPath(file, currentPathInit);

  return fullPath.split('/').slice(1).join('/');
}

export function getPipelineConfigPath(
  file: FileType,
  currentPipelineName: string,
): string {
  return `${FOLDER_NAME_PIPELINES}/${currentPipelineName}/${file.name}`;
}

export function getBlockFromFile(
  file: FileType,
  currentPathInit: string = null,
) {
  const parts = getFullPath(file, currentPathInit).split('/');
  // This assumes path [block_type]s/[filename]
  const blockType = singularize(parts[0]);
  const fileName = parts[parts.length - 1];

  const pyRegex = new RegExp(`\.${FileExtensionEnum.PY}$`);
  if (BLOCK_TYPES.includes(blockType) && fileName.match(pyRegex)) {
    return {
      type: blockType,
      uuid: fileName.replace(pyRegex, ''),
    };
  }
}

export function getYamlBlockFromFile(
  file: FileType,
  currentPathInit: string = null,
): BlockType {
  const parts = getFullPath(file, currentPathInit).split('/');
  // This assumes path [block_type]s/[filename]
  const blockType = singularize(parts[0]);
  const fileName = parts[parts.length - 1];

  const yamlRegex = new RegExp(`\.${FileExtensionEnum.YAML}$`);
  if (YAML_BLOCK_TYPES.includes(blockType) && fileName.match(yamlRegex)) {
    return {
      type: blockType,
      uuid: fileName.replace(yamlRegex, ''),
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
