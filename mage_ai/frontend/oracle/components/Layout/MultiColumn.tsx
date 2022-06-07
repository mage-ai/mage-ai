import React, { useRef } from 'react';

import Divider from '@oracle/elements/Divider';
import Spacing from '@oracle/elements/Spacing';
import {
  AFTER_TOTAL_WIDTH as afterTotalWidth,
  AsideInnerStyle,
  AsideStyle,
  HeaderStyle,
  MainContentInnerStyle,
  MainContentStyle,
} from './MultiColumn.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { useWindowSize } from '@utils/sizes';

export const AFTER_TOTAL_WIDTH = afterTotalWidth;

type MultiColumnProps = {
  after: any;
  children: any;
  header: any;
};

function MultiColumn({
  after,
  children,
  header,
}: MultiColumnProps) {
  const { width } = useWindowSize();
  const refHeader = useRef(null);

  const {
    height: heightHeader,
  } = refHeader?.current?.getBoundingClientRect?.() || {};

  return (
    <>
      <HeaderStyle ref={refHeader}>
        <Spacing p={PADDING_UNITS}>
          {header}
        </Spacing>
      </HeaderStyle>

      <MainContentStyle headerOffset={heightHeader}>
        <MainContentInnerStyle>
          <Spacing p={PADDING_UNITS}>
            {children}
          </Spacing>
        </MainContentInnerStyle>
      </MainContentStyle>

      <AsideStyle headerOffset={heightHeader}>
        <AsideInnerStyle>
          <Spacing p={PADDING_UNITS}>
            {after}
          </Spacing>
        </AsideInnerStyle>
      </AsideStyle>
    </>
  );
}

export default MultiColumn;
