import React, { useRef } from 'react';

import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import {
  AsideInnerStyle,
  AsideStyle,
  BeforeInnerStyle,
  BeforeStyle,
  HeaderStyle,
  MainContentInnerStyle,
  MainContentStyle,
  TabStyle,
} from './MultiColumn.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { useWindowSize } from '@utils/sizes';

type MultiColumnProps = {
  after: any;
  before?: any;
  children: any;
  header: any;
  mainContentRef?: any;
  onTabClick?: (tab: string) => void;
  selectedTab?: string;
  tabs?: string[];
};

function MultiColumn({
  after,
  before,
  children,
  header,
  mainContentRef,
  onTabClick,
  selectedTab,
  tabs,
}: MultiColumnProps) {
  const { width } = useWindowSize();
  const refHeader = useRef(null);

  const {
    height: heightHeader,
  } = refHeader?.current?.getBoundingClientRect?.() || {};

  return (
    <>
      {before && (
        <BeforeStyle>
          <BeforeInnerStyle>
            {before}
          </BeforeInnerStyle>
        </BeforeStyle>
      )}

      <HeaderStyle
        beforeVisible={!!before}
        ref={refHeader}
      >
        {header}

        {tabs && (
          <Spacing px={PADDING_UNITS}>
            <FlexContainer>
              {tabs.map((key: string, idx: number) => (
                <Link
                  block
                  bold={selectedTab === key}
                  key={key}
                  noHoverUnderline
                  noOutline
                  onClick={() => onTabClick(key)}
                  preventDefault
                >
                  <TabStyle
                    first={idx === 0}
                    selected={selectedTab === key}
                  >
                    {key}
                  </TabStyle>
                </Link>
              ))}
            </FlexContainer>
          </Spacing>
        )}
      </HeaderStyle>

      <MainContentStyle
        beforeVisible={!!before}
        headerOffset={heightHeader}
        ref={mainContentRef}
      >
        <MainContentInnerStyle>
          {children}
        </MainContentInnerStyle>
      </MainContentStyle>

      <AsideStyle headerOffset={heightHeader}>
        <AsideInnerStyle>
          {after}
        </AsideInnerStyle>
      </AsideStyle>
    </>
  );
}

export default MultiColumn;
