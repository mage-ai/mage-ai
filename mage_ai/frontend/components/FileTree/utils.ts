import BlockType from '@interfaces/BlockType';

export const getBlockType = (path: string[]) => (
    path.at(-2).slice(0, -1)
);

export const getBlockUUID = (path: string[]) => (
    path.at(-1).slice(0, -3)
);

export const findBlockByPath = (blocks: BlockType[], path: string[]) => (
    blocks.find(({ uuid }) => getBlockUUID(path) === uuid)
);

export const isBlockType = (path: string[]) => (
    path.at(-1).slice(-2) === 'py'
);
