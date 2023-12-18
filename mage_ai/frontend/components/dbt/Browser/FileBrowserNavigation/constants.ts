export enum FileContextTab {
  BLOCKS = 'blocks',
  FILES = 'files',
}

export function getTabs() {
  return [
    {
      uuid: FileContextTab.FILES,
    },
    {
      uuid: FileContextTab.BLOCKS,
    },
  ];
}
