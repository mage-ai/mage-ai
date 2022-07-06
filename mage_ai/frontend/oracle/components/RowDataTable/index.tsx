import React from 'react';

import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';

import {
  RowContainerStyle,
  TitleStyle,
} from './index.style';

export type RowDataTableProps = {
  alternating?: boolean;
  children: any;
  headerDetails?: string;
  headerTitle: string;
  minHeight?: number;
  scrollable?: boolean;
};

function RowDataTable({
  alternating,
  children,
  headerDetails,
  headerTitle,
  minHeight,
  scrollable,
}: RowDataTableProps) {
  return (
    <>
      <TitleStyle>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Text bold default>
            {headerTitle}
          </Text>
          {headerDetails &&
            <Text>
              {headerDetails}
            </Text>
          }
        </FlexContainer>
      </TitleStyle>

      <RowContainerStyle
        minHeight={minHeight}
        scrollable={scrollable}
      >
        {React.Children.map(children, (row, idx) => row && React.cloneElement(
          row,
          {
            last: idx === children.length - 1,
            secondary: alternating && idx % 2 === 1,
          },
        ))}
      </RowContainerStyle>
    </>
  );
}

export default RowDataTable;
