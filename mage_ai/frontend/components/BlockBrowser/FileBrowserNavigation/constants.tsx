import { BatchSquaresStacked, FolderOutline } from '@oracle/icons';

export enum FileContextTab {
  BLOCKS = 'blocks',
  FILES = 'files',
}

export function getTabs() {
  return [
    {
      Icon: FolderOutline,
      uuid: FileContextTab.FILES,
    },
    {
      Icon: BatchSquaresStacked,
      uuid: FileContextTab.BLOCKS,
    },
  ];
}
