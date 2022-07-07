import BlockType from '@interfaces/BlockType';
import { FileExtensionEnum } from '@interfaces/FileType';

export const getBlockFilename = (path: string[]) => path.at(-1);

export const getBlockType = (path: string[]) => (
  path.at(-2).slice(0, -1)
);

export const getBlockUUID = (path: string[]) => (
  getBlockFilename(path).slice(0, -3)
);

export const findBlockByPath = (blocks: BlockType[], path: string[]) => (
  blocks.find(({ uuid }) => getBlockUUID(path) === uuid)
);

export const isBlockType = (path: string[]) => (
  getBlockFilename(path).slice(-2) === FileExtensionEnum.PY
);

export function getPipelineUUID(path: string[]) {
  console.log(path)
  const idx = path.indexOf('pipelines');

  if (idx !== -1 && idx === path.length - 2) {
    return path[path.length - 1];
  };
}

export function isPipelineFilePath(path: string[]) {
  return !!getPipelineUUID(path);
}
