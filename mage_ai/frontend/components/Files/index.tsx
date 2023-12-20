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
  }, []);

  return (
    <Dashboard
      after={versions}
      afterHidden={!(versionsVisible && selectedFilePath)}
      before={browser}
      contained
      headerOffset={headerOffset + HEADER_HEIGHT}
      mainContainerHeader={filePaths?.length >= 1
        ? ({ width }) => {
          return (
            <div ref={refHeader}>
              <FlexContainer alignItems="center">
                <Spacing pl={1} />
                {menu}
                <Spacing pr={1} />

                <FileTabsScroller width={width}>
                  {tabs}
                </FileTabsScroller>
              </FlexContainer>

              <Divider light />
            </div>
          );
        }
        : null
      }
      title="Files"
      uuid="Files/index"
    >
      {controller}
    </Dashboard>
  );
}

export default FilesPageComponent;
