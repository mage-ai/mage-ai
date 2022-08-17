import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { FileExtensionEnum } from '@interfaces/FileType';

export const getBlockFilename = (path: string[]) => path.at(-1);

export const getBlockPath = (b: BlockType) => `${b.type}s/${b.uuid}.py`;

export const getBlockType = (path: string[]): BlockTypeEnum => (
  path.at(-2).slice(0, -1) as BlockTypeEnum
);

export const getBlockUUID = (path: string[]) => {
  return getBlockFilename(path).split('.')[0];
};

export const findBlockByPath = (blocks: BlockType[], path: string[]) => (
  blocks.find(({ uuid }) => getBlockUUID(path) === uuid)
);

export const isBlockType = (path: string[]) => (
  getBlockFilename(path).slice(-2) === FileExtensionEnum.PY
);

export function getPipelineUUID(path: string[]) {
  const idx = path.indexOf('pipelines');

  if (idx !== -1 && idx === path.length - 2) {
    return path[path.length - 1];
  }
}

export function isPipelineFilePath(path: string[]) {
  return !!getPipelineUUID(path);
}
