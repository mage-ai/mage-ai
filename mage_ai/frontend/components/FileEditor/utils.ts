import { BlockTypeEnum } from '@interfaces/BlockType';

export const getBlockFilename = (path: string[]) => path.at(-1);

export const getBlockType = (path: string[]): BlockTypeEnum => (
  path.at(-2).slice(0, -1) as BlockTypeEnum
);

export const getBlockUUID = (path: string[]) => (
  getBlockFilename(path).split('.')[0]
);
