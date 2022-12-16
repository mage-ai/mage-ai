import React from 'react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import { RowStyle } from '@oracle/components/RowDataTable/index.style';

export type RowCardProps = {
  border?: boolean;
  children: any;
  columnFlexNumbers?: number[];
  condensed?: boolean;
  flexStart?: boolean;
  last?: boolean;
  noHorizontalPadding?: boolean;
  secondary?: boolean;
};

function RowCard({
  border,
  children,
  columnFlexNumbers,
  condensed,
  flexStart,
  last,
  noHorizontalPadding,
  secondary,
}: RowCardProps) {
  return (
    <RowStyle
      border={border}
      condensed={condensed}
      last={last}
      noHorizontalPadding={noHorizontalPadding}
      secondary={secondary}
    >
      <FlexContainer alignItems={flexStart ? 'flex-start' : 'center'}>
        {React.Children.map(children, (child, idx) => child && columnFlexNumbers
          ? (
            <Flex
              alignItems="center"
              flex={columnFlexNumbers[idx]}
              key={`row-card-item-${idx}`}
            >
              {child}
            </Flex>
          )
          : child,
        )}
      </FlexContainer>
    </RowStyle>
  );
}

export default RowCard;
