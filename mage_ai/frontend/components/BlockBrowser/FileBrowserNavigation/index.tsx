import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import BlockNavigation from '@components/CustomTemplates/BrowseTemplates/Navigation/BlockNavigation';
import CacheItemType from '@interfaces/CacheItemType';
import FileBrowser from '@components/FileBrowser';
import FileType from '@interfaces/FileType';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import useFiles from '@utils/models/file/useFiles';
import { ALL_BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import { DBT } from '@oracle/icons';
import { FileContextTab, NavLinkUUIDEnum, NAV_LINKS } from './constants';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { pluralize } from '@utils/string';
import { sortByKey } from '@utils/array';
import { useError } from '@context/Error';

type FileBrowserNavigationProps = {
  cacheItems: CacheItemType[];
  selectedLinks?: NavLinkType[];
  selectedTab: (value: TabType) => void;
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

  const navLinks = useMemo(() => {
    if (selectedLinks?.find(({ uuid }) => BlockTypeEnum.DBT === uuid)) {
      return [{
        Icon: DBT,
        label: () => 'All projects',
        uuid: NavLinkUUIDEnum.ALL_PROJECTS,
        // @ts-ignore
      }].concat(sortByKey(cacheItems, ({ item }) => item?.project?.name)?.map(({
        item,
      }) => {
        const project = item?.project;

        return {
          Icon: DBT,
          label: () => (
            <Text monospace noWrapping>
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

    return NAV_LINKS;
  }, [
    cacheItems,
    selectedLinks,
  ]);

  const selectedBlockType = useMemo(() => selectedLinks?.find(({
    uuid,
  }) => uuid in ALL_BLOCK_TYPES)?.uuid as BlockTypeEnum, [
    selectedLinks,
  ]);

  useEffect(() => {
    if (selectedBlockType && selectedLinks?.length === 1) {
      // @ts-ignore
      setSelectedLinks(prev => [navLinks?.[0]].concat(prev));
    }
  }, [
    navLinks,
    selectedBlockType,
    selectedLinks,
  ]);

  return (
    <>
      {FileContextTab.FILES === selectedTab?.uuid && (
        <FileBrowser
          fetchFileTree={fetch}
          files={files}
          onClickFile={(path: string) => console.log(path)}
          onClickFolder={(path: string) => console.log(path, true)}
          onCreateFile={({ path }: FileType) => console.log(path)}
          ref={fileTreeRef}
          setErrors={showError}
        />
      )}

      {FileContextTab.BLOCKS === selectedTab?.uuid && (
        <BlockNavigation
          navLinks={navLinks}
          selectedLink={selectedLinks?.[0]}
          setSelectedLink={value => setSelectedLinks(prev => {
            if (prev?.length >= 2) {
              // @ts-ignore
              return [value].concat((prev || []).slice(1));
            }

            // @ts-ignore
            return [value].concat(prev || []);
          })}
        />
      )}
    </>
  );
}

export default FileBrowserNavigation;
