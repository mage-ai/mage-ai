import * as osPath from 'path';
import BlockType from '@interfaces/BlockType';

export const DBT_FLAG_FULL_REFRESH = '--full-refresh';

export function getModelName(block: BlockType, opts?: { fullPath: boolean }): string {
  const fullPath = opts?.fullPath;
  const filePath = block?.configuration?.file_path;

  if (fullPath) {
    return block?.uuid;
  } else if (filePath) {
    const parts = filePath.split(osPath.sep);
    const fullName = parts[parts.length - 1];
    const nameWithoutExtension = fullName.split('.');
    nameWithoutExtension.pop();

    return nameWithoutExtension.join('.');
  }
}

export function getModelAttributes(block: BlockType): {
  directory?: string;
  filePath: string;
  name?: string;
  project?: string;
} {
  const filePath = block?.configuration?.file_path;

  if (filePath) {
    const parts = filePath.split(osPath.sep);
    const project = parts[0];
    const modelName = parts[parts.length - 1];
    const modelNameWithoutExtension = modelName.split('.');
    modelNameWithoutExtension.pop();

    return {
      directory: parts.slice(1, parts.length - 1).join(osPath.sep),
      filePath,
      name: modelNameWithoutExtension.join('.'),
      project,
    };
  }

  return {
    filePath,
  };
}
