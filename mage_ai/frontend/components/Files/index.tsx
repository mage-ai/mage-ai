import { useEffect, useRef, useState } from 'react';

import Controller from '@components/FileEditor/Controller';
import Dashboard from '@components/Dashboard';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import useFileComponents from '@components/Files/useFileComponents';
import FileTabsScroller from '@components/FileTabsScroller';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';

import {
  HeaderStyle,
  MAIN_CONTENT_TOP_OFFSET,
  MenuStyle,
  TabsStyle,
} from './index.style';

function FilesPageComponent() {
  const refHeader = useRef(null);
  const [headerOffset, setHeaderOffset] = useState(null);

  const {
    browser,
    controller,
    filePaths,
    menu,
    selectedFilePath,
    tabs,
    versions,
    versionsVisible,
  } = useFileComponents();

  useEffect(() => {
    setTimeout(() => setHeaderOffset(refHeader?.current?.getBoundingClientRect()?.height || 0), 1);
  }, [filePaths]);

  return (
    <Dashboard
      after={versions}
      afterHidden={!(versionsVisible && selectedFilePath)}
      before={browser}
      contained
      headerOffset={headerOffset + HEADER_HEIGHT}
      mainContainerHeader={({ widthOffset }) => {
        return (
          <div
            ref={refHeader}
            style={{
              position: 'relative',
              zIndex: 3,
            }}
          >
            <Spacing p={1}>
              <FlexContainer alignItems="center">
                {menu}
              </FlexContainer>
            </Spacing>

            <Divider light />

            <FileTabsScroller widthOffset={widthOffset}>
              {tabs}
            </FileTabsScroller>
          </div>
        );
      }}
      title="Files"
      uuid="Files/index"
    >
      {controller}
    </Dashboard>
  );
}

export default FilesPageComponent;
