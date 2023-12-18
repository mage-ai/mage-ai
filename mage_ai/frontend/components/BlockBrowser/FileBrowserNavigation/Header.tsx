import { useEffect } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { getTabs } from './constants';

type FileBrowserNavigationHeaderProps = {
  selectedTab?: TabType;
  setSelectedTab?: (tab: TabType) => void;
}

function FileBrowserNavigationHeader({
  selectedTab,
  setSelectedTab,
}: FileBrowserNavigationHeaderProps) {
  const tabs = getTabs();

  useEffect(() => {
    setSelectedTab(prev => prev ? prev : tabs?.[0]);
  }, []);

  return (
    <>
      <ButtonTabs
        large
        onClickTab={tab => setSelectedTab?.(tab)}
        selectedTabUUID={selectedTab?.uuid}
        tabs={tabs}
        underlineStyle
      />
    </>
  );
}


export default FileBrowserNavigationHeader;
