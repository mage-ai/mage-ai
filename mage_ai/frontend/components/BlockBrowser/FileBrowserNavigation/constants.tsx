import { ALL_BLOCK_TYPES } from '@interfaces/BlockType';
import { BatchSquaresStacked, FolderOutline } from '@oracle/icons';
import { NAV_LINKS as NAV_LINKS_INIT } from '@components/CustomTemplates/BrowseTemplates/constants';
import { TemplateShapes } from '@oracle/icons';

export enum FileContextTab {
  BLOCKS = 'blocks',
  FILES = 'files',
}

export enum NavLinkUUIDEnum {
  ALL_BLOCKS = 'all_blocks',
  ALL_BLOCKS_IN_TYPE = 'all_blocks_in_type',
}

export const NAV_LINKS = [
  {
    Icon: TemplateShapes,
    label: () => 'All blocks',
    uuid: NavLinkUUIDEnum.ALL_BLOCKS,
  },
  // @ts-ignore
].concat(NAV_LINKS_INIT?.filter(({
  uuid,
}) => uuid in ALL_BLOCK_TYPES));

export const TABS_MAPPING = {
  [FileContextTab.FILES]: {
    Icon: FolderOutline,
    uuid: FileContextTab.FILES,
  },
  [FileContextTab.BLOCKS]: {
    Icon: BatchSquaresStacked,
    uuid: FileContextTab.BLOCKS,
  },
};

export function getTabs() {
  return [
    TABS_MAPPING[FileContextTab.FILES],
    TABS_MAPPING[FileContextTab.BLOCKS],
  ];
}
