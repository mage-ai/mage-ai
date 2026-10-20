import CacheItemType from '@interfaces/CacheItemType';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import { ALL_BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import { FILE_EXTENSION_ICON_MAPPING } from '@components/FileBrowser/constants';
import { FileExtensionEnum } from '@interfaces/FileType';
import { FolderOutline } from '@oracle/icons';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { NavLinkUUIDEnum } from './constants';
import { pluralize } from '@utils/string';
import { sortByKey } from '@utils/array';

export function buildNavLinkModels(models: {
  directory: string;
  fileExtension: string;
  filePath: string;
  name: string;
}[]) {
  return models?.map(({
    directory,
    fileExtension,
    filePath,
    name,
  }) => ({
    Icon: FILE_EXTENSION_ICON_MAPPING[fileExtension as FileExtensionEnum],
    label: () => (
      <Text monospace noWrapping>
        {name}
      </Text>
    ),
    description: () => (
      <FlexContainer flexDirection="column">
        <Text monospace muted noWrapping small>
          {directory}
        </Text>
      </FlexContainer>
    ),
    uuid: filePath,
  }));
}

export function buildNavLinks(cacheItems) {
  return [
    {
      Icon: FolderOutline,
      label: () => pluralize('project', cacheItems?.length || 0),
      uuid: NavLinkUUIDEnum.ALL_BLOCKS_IN_TYPE,
    },
    // @ts-ignore
  ].concat(sortByKey(cacheItems || [], ({ item }) => item?.project?.name)?.map(({
    item,
  }) => {
    const project = item?.project;

    return {
      Icon: FolderOutline,
      label: ({
        selectedLinks,
      }: {
        selectedLinks: NavLinkType[];
      } = {
        selectedLinks: null,
      }) => (
        <Text default={selectedLinks?.length >= 3} monospace noWrapping>
          {project?.name}
        </Text>
      ),
      description: () => (
        <FlexContainer flexDirection="column">
          <Text monospace muted noWrapping small>
            {pluralize('model', item?.models?.length || 0)}
          </Text>

          <Text monospace muted noWrapping small>
            {project?.uuid}
          </Text>
        </FlexContainer>
      ),
      uuid: project?.uuid,
    };
  }));
}

export function handleNextSelectedLinks(valueInit, prev, cacheItems: CacheItemType[] = null) {
  const count = prev?.length || 0;

  const current = prev?.[0]?.uuid;

  let value = valueInit;
  if (!Array.isArray(valueInit)) {
    value = [valueInit];
  }
  const next = value?.[0]?.uuid;

  const nextIsAllBlocks = NavLinkUUIDEnum.ALL_BLOCKS === next;
  const nextIsBlockBase = next in ALL_BLOCK_TYPES;
  const nextIsAllBlocksInType = NavLinkUUIDEnum.ALL_BLOCKS_IN_TYPE === next;

  const currentIsItem = cacheItems && cacheItems?.find(({ uuid }) => uuid === current);
  const nextIsItem = cacheItems && cacheItems?.find(({ uuid }) => uuid === next);

  const currentBlockType = prev?.find(({ uuid }) => uuid in ALL_BLOCK_TYPES)?.uuid;

  // e.g. Nothing selected
  if (0 === count) {
    if (nextIsAllBlocks) {
      return [];
    } else {
      return value;
    }
  }

  if (1 <= count) {
    if (nextIsAllBlocks) {
      return [];
    } else if (nextIsBlockBase) {
      // All blocks, DBT, Transformer, etc.
      // Swap the values
      return value;
    }
  }

  if (2 <= count) {
    // DBT -> Project
    if (nextIsBlockBase) {
      // Reset the base
      // @ts-ignore
      return value;
    } else if (nextIsAllBlocksInType) {
      return prev?.slice(count - 1);
    } else if (currentIsItem && nextIsItem) {
      // @ts-ignore
      return value.concat(prev?.slice(count - 1));
    } else if (value?.length >= 2) {
      // @ts-ignore
      return value.concat(prev?.slice(1));
    }
  }

  if (3 <= count) {
    // dbt -> Project -> model
    // Swap the existing selected model.
    if (BlockTypeEnum.DBT === currentBlockType) {
      // @ts-ignore
      return value.concat(prev?.slice(1));
    }
  }

  // @ts-ignore
  return value.concat(prev || []);
}

export function handleNavigateBack(numberOfSteps: number, prev) {
  const arr = prev?.slice(numberOfSteps === null ? 1 : numberOfSteps);
  const count = arr?.length || 0;

  if (arr?.length >= 1) {
    return arr;
  }

  return null;
}

export function defaultSelectedLink(selectedLinks, navLinks) {
  if (BlockTypeEnum.DBT === selectedLinks?.[0]?.uuid) {
    return navLinks?.[0];
  }

  return selectedLinks?.[0] || navLinks?.[0];
}
