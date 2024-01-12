import { useEffect, useRef, useState } from 'react';

import Divider from '@oracle/elements/Divider';
import FileTabsScroller from '@components/FileTabsScroller';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import TripleLayout from '@components/TripleLayout';
import useFileComponents from '@components/Files/useFileComponents';
import useTripleLayout from '@components/TripleLayout/useTripleLayout';
import { ApplicationExpansionUUIDEnum } from '@storage/ApplicationManager/constants';
import { ContainerStyle } from '../index.style';

function ArcaneLibrary({
  containerRef,
  headerOffset: headerOffsetProp,
  query,
}: {
  containerRef: {
    current: HTMLDivElement;
  };
  headerOffset: number;
  query?: {
    file_path: string;
  };
}) {
  const refHeader = useRef(null);
  const [headerOffset, setHeaderOffset] = useState(null);

  const {
    mainContainerRef,
    mousedownActiveAfter,
    mousedownActiveBefore,
    setMousedownActiveAfter,
    setMousedownActiveBefore,
    setWidthAfter,
    setWidthBefore,
    widthAfter,
    widthBefore,
  } = useTripleLayout(ApplicationExpansionUUIDEnum.ArcaneLibrary);

  const {
    browser,
    controller,
    filePaths,
    footer,
    menu,
    selectedFilePath,
    tabs,
    versions,
    versionsVisible,
  } = useFileComponents({
    contained: true,
    containerRef: mainContainerRef,
    selectedFilePath: query?.file_path,
    showHiddenFilesSetting: true,
    uuid: ApplicationExpansionUUIDEnum.ArcaneLibrary,
  });

  useEffect(() => {
    setTimeout(() => setHeaderOffset(refHeader?.current?.getBoundingClientRect()?.height || 0), 1);
  }, [filePaths]);

  return (
    <ContainerStyle>
      <TripleLayout
        after={versions}
        afterHeightOffset={0}
        afterHidden={!(versionsVisible && selectedFilePath)}
        afterMousedownActive={mousedownActiveAfter}
        afterWidth={widthAfter}
        autoLayout
        before={browser}
        beforeContentHeightOffset={48}
        beforeHeaderOffset={0}
        beforeHeightOffset={0}
        beforeHidden={false}
        beforeMousedownActive={mousedownActiveBefore}
        beforeWidth={widthBefore}
        contained
        containerRef={containerRef}
        inline
        mainContainerFooter={footer}
        mainContainerHeader={({ widthOffset }) => (
          <div
            ref={refHeader}
            style={{
              position: 'relative',
              zIndex: 3,
            }}
          >
            <Spacing py={1}>
              <FlexContainer alignItems="center">
                {menu}
              </FlexContainer>
            </Spacing>

            <Divider light />

            <FileTabsScroller widthOffset={widthOffset}>
              {tabs}
            </FileTabsScroller>
          </div>
        )}
        mainContainerRef={mainContainerRef}
        noBackground
        setAfterMousedownActive={setMousedownActiveAfter}
        setAfterWidth={setWidthAfter}
        setBeforeMousedownActive={setMousedownActiveBefore}
        setBeforeWidth={setWidthBefore}
        uuid={ApplicationExpansionUUIDEnum.ArcaneLibrary}
      >
        {controller}
      </TripleLayout>
    </ContainerStyle>
  );
}

export default ArcaneLibrary;
