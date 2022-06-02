import React from 'react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import { RowStyle } from '@oracle/components/RowDataTable/index.style';

export type RowCardProps = {
  border?: boolean;
  children: any;
  columnFlexNumbers: number[];
  last?: boolean;
  noHorizontalPadding?: boolean;
  secondary?: boolean;
};

function RowCard({
  border,
  children,
  columnFlexNumbers,
  last,
  noHorizontalPadding,
  secondary,
}: RowCardProps) {
  return (
    <RowStyle
      border={border}
      last={last}
      noHorizontalPadding={noHorizontalPadding}
      secondary={secondary}
    >
      <FlexContainer alignItems="center">
        {React.Children.map(children, (child, idx) => child && (
          <Flex
            flex={columnFlexNumbers[idx]}
            key={`row-card-item-${idx}`}
          >
            {child}
          </Flex>
        ))}
      </FlexContainer>
    </RowStyle>
  );
}

export default RowCard;
