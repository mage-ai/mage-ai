import FileType, {
  CODE_BLOCK_FILE_EXTENSIONS,
  FileExtensionEnum,
  FOLDER_NAME_PIPELINES,
} from '@interfaces/FileType';
import { BLOCK_TYPES } from '@interfaces/BlockType';
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

export function getBlockFromFile(
  file: FileType,
  currentPathInit: string = null,
) {
  const parts = getFullPath(file, currentPathInit).split('/');
  // This assumes path default_repo/[block_type]s/..
  const blockType = singularize(parts[1]);
  const fileName = parts[parts.length - 1];

  const pyRegex = new RegExp(`\.${FileExtensionEnum.PY}$`);
  if (BLOCK_TYPES.includes(blockType) && fileName.match(pyRegex)) {
    return {
      type: blockType,
      uuid: fileName.replace(pyRegex, ''),
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
