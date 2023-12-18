import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import BlockNavigation from '@components/CustomTemplates/BrowseTemplates/Navigation/BlockNavigation';
import FileBrowser from '@components/FileBrowser';
import FileType from '@interfaces/FileType';
import useFiles from '@utils/models/file/useFiles';
import { FileContextTab, NavLinkUUIDEnum, NAV_LINKS } from './constants';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
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

  useEffect(() => {
    if (FileContextTab.BLOCKS === selectedTab?.uuid) {
      setSelectedLink?.(prev => prev ? prev : NAV_LINKS?.[0]);
    }
  }, [selectedTab]);

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
          navLinks={NAV_LINKS}
          selectedLink={selectedLink}
          setSelectedLink={setSelectedLink}
        />
      )}
    </>
  );
}

export default FileBrowserNavigation;
