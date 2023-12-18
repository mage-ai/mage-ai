import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import BlockNavigation from '@components/CustomTemplates/BrowseTemplates/Navigation/BlockNavigation';
import FileBrowser from '@components/FileBrowser';
import FileType from '@interfaces/FileType';
import useFiles from '@utils/models/file/useFiles';
import { ALL_BLOCK_TYPES } from '@interfaces/BlockType';
import { FileContextTab } from './constants';
import { NAV_LINKS, NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { useError } from '@context/Error';

type FileBrowserNavigationProps = {
  selectedLink?: NavLinkType;
  selectedTab: (value: TabType) => void;
  setSelectedLink: (value: NavLinkType) => void;
};

function FileBrowserNavigation({
  selectedLink,
  selectedTab,
  setSelectedLink,
}: FileBrowserNavigationProps) {
  const fileTreeRef = useRef(null);
  const {
    fetch,
    files,
  } = useFiles();

  const [showError] = useError(null, {}, [], {
    uuid: 'FileBrowserNavigation',
  });

  const navLinks = NAV_LINKS?.filter(({ uuid }) => uuid in ALL_BLOCK_TYPES);

  useEffect(() => {
    setSelectedLink?.(prev => prev ? prev : navLinks?.[0]);
  }, []);

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
          selectedLink={selectedLink}
          setSelectedLink={setSelectedLink}
        />
      )}
    </>
  );
}

export default FileBrowserNavigation;
