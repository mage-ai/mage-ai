import BlockType from '@interfaces/BlockType';

export function getModelName(block: BlockType, opts?: { fullPath: boolean }): string {
  const fullPath = opts?.fullPath;
  const filePath = block?.configuration?.file_path;

  if (fullPath) {
    return block?.uuid;
  } else if (filePath) {
    const parts = filePath.split('/');
    const fullName = parts[parts.length - 1];
    const nameWithoutExtension = fullName.split('.');
    nameWithoutExtension.pop();

    return nameWithoutExtension.join('.');
  }
}
