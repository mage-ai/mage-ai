import BlockType from '@interfaces/BlockType';

export function getModelName(block: BlockType): string {
  const filePath = block?.configuration?.file_path;

  if (filePath) {
    const parts = filePath.split('/');
    const fullName = parts[parts.length - 1];

    return fullName.split('.')[0];
  }
}
