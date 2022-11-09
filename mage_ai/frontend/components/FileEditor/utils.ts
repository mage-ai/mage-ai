import { BlockTypeEnum } from '@interfaces/BlockType';

export const getBlockFilename = (path: string[]) => path.at(-1);

export const getBlockType = (path: string[]): BlockTypeEnum => {
  const blockTypeFolder = path[0];

  if (blockTypeFolder === BlockTypeEnum.DBT) {
    return blockTypeFolder;
  }

  return path[0].slice(0, -1) as BlockTypeEnum;
};

export const getBlockUUID = (path: string[]) => {
  const blockTypeFolder = path[0];

  if (blockTypeFolder === BlockTypeEnum.DBT) {
    return path.slice(1).join('/');
  }

  return getBlockFilename(path).split('.')[0];
};
