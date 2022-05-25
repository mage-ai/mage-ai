import React from 'react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { RowStyle } from '@oracle/components/RowDataTable/index.style';

export type RowCardProps = {
  children: any;
  columnFlexNumbers: number[];
  last?: boolean;
  secondary?: boolean;
};

function RowCard({
  children,
  columnFlexNumbers,
  last,
  secondary,
}: RowCardProps) {
  return (
    <RowStyle
      last={last}
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
