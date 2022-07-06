import BlockType from '@interfaces/BlockType';

export const getBlockUUID = (path: string[]) => (
    path.at(-1).slice(0, -3)
);

export const findBlockByPath = (blocks: BlockType[], path: string[]) => (
    blocks.find(({ uuid }) => getBlockUUID(path) === uuid)
);
