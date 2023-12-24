import React, { useEffect } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import FlexContainer from '@oracle/components/FlexContainer';
import { HeaderStyle } from '../BrowserHeader/index.style';
import { getTabs } from './constants';

type FileBrowserNavigationHeaderProps = {
  selectedTab?: TabType;
  setSelectedTab?: (tab: TabType) => void;
}

function FileBrowserNavigationHeader({
  selectedTab,
  setSelectedTab,
}: FileBrowserNavigationHeaderProps, ref) {
  const tabs = getTabs();

  useEffect(() => {
    // @ts-ignore
    setSelectedTab(prev => prev ? prev : tabs?.[0]);
  }, []);

  return (
    <HeaderStyle ref={ref}>
      <FlexContainer alignItems="flex-end" fullHeight>
        <ButtonTabs
          onClickTab={tab => setSelectedTab?.(tab)}
          selectedTabUUID={selectedTab?.uuid}
          tabs={tabs}
          underlineStyle
        />
      </FlexContainer>
    </HeaderStyle>
  );
}

export default React.forwardRef(FileBrowserNavigationHeader);
