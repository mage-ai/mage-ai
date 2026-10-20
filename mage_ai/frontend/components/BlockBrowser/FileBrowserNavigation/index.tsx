import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import BlockNavigation from '@components/CustomTemplates/BrowseTemplates/Navigation/BlockNavigation';
import CacheItemType from '@interfaces/CacheItemType';
import FileBrowser from '@components/FileBrowser';
import FileType, { FileExtensionEnum } from '@interfaces/FileType';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import useFiles from '@utils/models/file/useFiles';
import { ALL_BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import { FileContextTab, NavLinkUUIDEnum, NAV_LINKS } from './constants';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { buildModels } from '../utils';
import { buildNavLinks, buildNavLinkModels, defaultSelectedLink, handleNextSelectedLinks } from './utils';
import { useError } from '@context/Error';

type FileBrowserNavigationProps = {
  cacheItems: CacheItemType[];
  selectedLinks?: NavLinkType[];
  selectedTab?: TabType;
  setSelectedLinks: (value: NavLinkType[]) => void;
};

function FileBrowserNavigation({
  cacheItems,
  selectedLinks,
  selectedTab,
  setSelectedLinks,
}: FileBrowserNavigationProps) {
  const [showError] = useError(null, {}, [], {
    uuid: 'FileBrowserNavigation',
  });

  const fileTreeRef = useRef(null);
  const {
    fetch,
    files,
  } = useFiles();

  const selectedItem = useMemo(() => {
    const uuids = selectedLinks?.slice(0, 2)?.map(({ uuid }) => uuid);

    return cacheItems?.find(({
      item,
    }) => uuids?.includes(item?.project?.uuid));
  }, [
    cacheItems,
    selectedLinks,
  ]);

  const navLinks = useMemo(() => {
    if (selectedLinks?.find(({ uuid }) => BlockTypeEnum.DBT === uuid)) {
      if (selectedItem && selectedLinks?.length >= 3) {
        const models = buildModels({
          models: selectedItem?.item?.models,
          project: selectedItem?.item?.project,
        });

        return buildNavLinkModels(models)
      }

      return buildNavLinks(cacheItems);
    }

    return NAV_LINKS;
  }, [
    cacheItems,
    selectedItem,
    selectedLinks,
  ]);

  const selectedBlockType = useMemo(() => selectedLinks?.find(({
    uuid,
  }) => uuid in ALL_BLOCK_TYPES)?.uuid as BlockTypeEnum, [
    selectedLinks,
  ]);

  return (
    <>
      {FileContextTab.FILES === selectedTab?.uuid && (
        <FileBrowser
          fetchFiles={fetch}
          files={files}
          onClickFile={(path: string, file: FileType) => console.log(path)}
          onClickFolder={(path: string, file: FileType) => console.log(path, true)}
          ref={fileTreeRef}
          showError={showError}
          uuid="FileBrowserNavigation"
        />
      )}

      {FileContextTab.BLOCKS === selectedTab?.uuid && (
        <BlockNavigation
          navLinks={navLinks || []}
          selectedLink={defaultSelectedLink(selectedLinks, navLinks)}
          // @ts-ignore
          setSelectedLink={value => setSelectedLinks(prev => handleNextSelectedLinks(
            value,
            prev,
            cacheItems,
          ))}
        />
      )}
    </>
  );
}

export default FileBrowserNavigation;
