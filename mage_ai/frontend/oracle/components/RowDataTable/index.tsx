import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';

import {
  RowContainerStyle,
  TitleStyle,
} from './index.style';

export type RowDataTableProps = {
  children: any;
  headerDetails?: string;
  headerTitle: string;
  minHeight?: number;
  scrollable?: boolean;
};

function RowDataTable({
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
          <Text bold>
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
        {children}
      </RowContainerStyle>
    </>
  );
}

export default RowDataTable;
