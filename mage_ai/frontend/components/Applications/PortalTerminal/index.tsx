import { useEffect, useRef, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import TripleLayout from '@components/TripleLayout';
import useApplicationBase, { ApplicationBaseType } from '../useApplicationBase';
import useTerminal from '@components/Terminal/useTerminal';
import useTripleLayout from '@components/TripleLayout/useTripleLayout';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { ContainerStyle } from '../index.style';

function PortalTerminal({
  ...props
}: ApplicationBaseType & {
}) {
  useApplicationBase(props);
  const {
    containerRef,
    headerOffset: headerOffsetProp,
  } = props;

  const {
    menuTabsCombined,
    terminal,
  } = useTerminal({
    uuid: ApplicationExpansionUUIDEnum.PortalTerminal,
  });

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
  } = useTripleLayout(ApplicationExpansionUUIDEnum.PortalTerminal, {
    hiddenAfter: true,
    hiddenBefore: true,
  });

  return (
    <ContainerStyle>
      <TripleLayout
        // after={versions}
        afterDividerContrast
        afterHeightOffset={0}
        afterHidden={hiddenAfter}
        afterMousedownActive={mousedownActiveAfter}
        afterWidth={widthAfter}
        autoLayout
        // before={FileBrowserTabEnum.GROUPED_BY_TYPE === selectedTab?.uuid ? browserFlatten : browser}
        beforeContentHeightOffset={headerOffsetProp}
        beforeDividerContrast
        // beforeHeader={}
        beforeHeightOffset={0}
        beforeHidden={hiddenBefore}
        beforeMousedownActive={mousedownActiveBefore}
        beforeWidth={widthBefore}
        contained
        containerRef={containerRef}
        hideAfterCompletely
        hideBeforeCompletely
        inline
        // mainContainerFooter={footer}
        mainContainerHeader={menuTabsCombined}
        mainContainerRef={mainContainerRef}
        noBackground
        setAfterHidden={setHiddenAfter}
        setAfterMousedownActive={setMousedownActiveAfter}
        setAfterWidth={setWidthAfter}
        setBeforeHidden={setHiddenBefore}
        setBeforeMousedownActive={setMousedownActiveBefore}
        setBeforeWidth={setWidthBefore}
        uuid={ApplicationExpansionUUIDEnum.PortalTerminal}
      >
        {terminal}
      </TripleLayout>
    </ContainerStyle>
  );
}

export default PortalTerminal;
