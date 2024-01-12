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
    hiddenAfter,
    hiddenBefore,
    mainContainerRef,
    mousedownActiveAfter,
    mousedownActiveBefore,
    setHiddenAfter,
    setHiddenBefore,
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
        afterDividerContrast
        afterHeightOffset={0}
        afterHidden={hiddenAfter}
        afterMousedownActive={mousedownActiveAfter}
        afterWidth={widthAfter}
        autoLayout
        before={browser}
        beforeContentHeightOffset={headerOffsetProp}
        beforeDividerContrast
        beforeHeightOffset={0}
        beforeHidden={hiddenBefore}
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
              {menu}
            </Spacing>

            <Divider light />

            <FileTabsScroller widthOffset={widthOffset}>
              {tabs}
            </FileTabsScroller>
          </div>
        )}
        mainContainerRef={mainContainerRef}
        noBackground
        setAfterHidden={setHiddenAfter}
        setAfterMousedownActive={setMousedownActiveAfter}
        setAfterWidth={setWidthAfter}
        setBeforeHidden={setHiddenBefore}
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
