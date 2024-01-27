import { useEffect, useRef, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import TripleLayout from '@components/TripleLayout';
import useApplicationBase, { ApplicationBaseType } from '../useApplicationBase';
import useFileComponents from '@components/Files/useFileComponents';
import useTripleLayout from '@components/TripleLayout/useTripleLayout';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { ContainerStyle } from '../index.style';
import { FILE_BROWSER_TABS, FileBrowserTabEnum } from './constants';

function ArcaneLibrary({
  query,
  ...props
}: ApplicationBaseType & {
   query?: {
    file_path: string;
  };
}) {
  useApplicationBase(props);
  const {
    containerRef,
    headerOffset: headerOffsetProp,
    startUpOptions,
  } = props;

  const [selectedTab, setSelectedTab] = useState<TabType>(FILE_BROWSER_TABS?.[0]);

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
  } = useTripleLayout(ApplicationExpansionUUIDEnum.ArcaneLibrary, {
    hiddenAfter: true,
  });

  const {
    browser,
    browserFlatten,
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
    selectedFilePath: query?.file_path
      || startUpOptions?.selectedFilePath ? String(startUpOptions?.selectedFilePath) : undefined,
    showHiddenFilesSetting: true,
    uuid: ApplicationExpansionUUIDEnum.ArcaneLibrary,
  });

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
        before={FileBrowserTabEnum.GROUPED_BY_TYPE === selectedTab?.uuid ? browserFlatten : browser}
        beforeContentHeightOffset={headerOffsetProp}
        beforeDividerContrast
        beforeHeader={(
          <FlexContainer alignItems="center" justifyContent="space-between">
            <ButtonTabs
              allowScroll
              onClickTab={(tab: TabType) => {
                setSelectedTab?.(tab);
              }}
              selectedTabUUID={selectedTab?.uuid}
              tabs={FILE_BROWSER_TABS}
              underlineColor="#4877FF"
              underlineStyle
              uppercase={false}
            />
          </FlexContainer>
        )}
        beforeHeightOffset={0}
        beforeHidden={hiddenBefore}
        beforeMousedownActive={mousedownActiveBefore}
        beforeWidth={widthBefore}
        contained
        containerRef={containerRef}
        inline
        mainContainerFooter={footer}
        mainContainerHeader={(
          <div
            style={{
              position: 'relative',
              zIndex: 3,
            }}
          >
            <Spacing py={1}>
              {menu}
            </Spacing>

            <Divider light />

            {tabs}
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
