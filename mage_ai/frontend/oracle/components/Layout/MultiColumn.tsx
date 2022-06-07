import React, { useRef } from 'react';

import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import {
  AFTER_TOTAL_WIDTH as afterTotalWidth,
  AsideInnerStyle,
  AsideStyle,
  HeaderStyle,
  MainContentInnerStyle,
  MainContentStyle,
  TabStyle,
} from './MultiColumn.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { useWindowSize } from '@utils/sizes';

export const AFTER_TOTAL_WIDTH = afterTotalWidth;

type MultiColumnProps = {
  after: any;
  children: any;
  header: any;
  onTabClick?: (tab: string) => void;
  selectedTab?: string;
  tabs?: string[];
};

function MultiColumn({
  after,
  children,
  header,
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
      <HeaderStyle ref={refHeader}>
        {header}

        {tabs && (
          <Spacing px={PADDING_UNITS}>
            <FlexContainer>

            {tabs.map((key: string, idx: number) => (
              <Link
                block
                bold={selectedTab === key}
                noHoverUnderline
                noOutline
                onClick={() => onTabClick(key)}
                preventDefault
              >
                <TabStyle
                  first={idx === 0}
                  key={key}
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

      <MainContentStyle headerOffset={heightHeader}>
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
