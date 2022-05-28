import { useMemo } from 'react';

import Cell from './Cell';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Text from '@oracle/elements/Text';
import {
  ColumnHeaderCellStyle,
  ColumnHeaderRowStyle,
  RowStyle,
  RowTitleStyle,
  TableStyle,
  TextStyle,
} from './index.style';
import { Check } from '@oracle/icons';
import Spacing from '@oracle/elements/Spacing';

export type OnClickRowProps = {
  rowGroupIndex: number;
  rowIndex: number;
  uuid: string;
};

type ColumnHeaderType = {
  Icon?: any;
  label: string;
};

type RowGroupDataType = {
  title?: string;
  rowData: {
    columnValues: (string | number | any)[];
    uuid: string | number;
  }[];
};

type SimpleDataTableProps = {
  columnFlexNumbers: number[];
  columnHeaders: ColumnHeaderType[];
  height?: number;
  isTextSelectionRequired?: boolean;
  onClickRow?: (opts: OnClickRowProps) => void;
  onHoverRow?: (opts: OnClickRowProps) => void;
  renderRowCellByIndex?: {
    [key: number]: (rowCellData: string | number, i18n: any) => any;
  };
  rowGroupData: RowGroupDataType[];
  selectedRowIndexes?: number[];
  small?: boolean;
  flex?: boolean;
};

function SimpleDataTable({
  columnFlexNumbers,
  columnHeaders,
  height,
  isTextSelectionRequired,
  onClickRow,
  onHoverRow,
  renderRowCellByIndex,
  rowGroupData,
  selectedRowIndexes,
  small,
  flex,
}: any) {
  const numberOfRowGroups = useMemo(() => rowGroupData.length, [rowGroupData]);

  return (
    <TableStyle
      flex={flex}
      height={height}
      scrollbarBorderRadiusLarge
    >
      <ColumnHeaderRowStyle>
        <FlexContainer alignItems="center">
          {columnHeaders.map(({
            Icon,
            label,
          }: ColumnHeaderType, idx: number) => {
            const key = label;

            return (
              <Flex
                flex={columnFlexNumbers[idx]}
                key={key}
              >
                <ColumnHeaderCellStyle
                  first={idx === 0}
                  small={small}
                >
                  <FlexContainer alignItems="center">
                    {Icon && (
                      <Check />
                    )}
                    {Icon && <Spacing mr={1} />}
                    <Text
                      bold
                    >
                      {key}
                    </Text>
                  </FlexContainer>
                </ColumnHeaderCellStyle>
              </Flex>
            );
          })}
        </FlexContainer>
      </ColumnHeaderRowStyle>

      {rowGroupData.map(({
        title,
        rowData,
      }: any, rowGroupIndex: number) => {
        const key = title || rowGroupIndex;
        const rowsEls = [];
        let titleEl;

        if (title) {
          titleEl = (
            <RowTitleStyle small={small}>
              <Text bold default>
                {title}
              </Text>
            </RowTitleStyle>
          );
        }

        const numberOfRows = rowData?.length;
        rowData?.forEach(({
          columnValues,
          uuid,
        }: {
          columnValues: (string | number | any)[];
          uuid: string;
        }, rowIndex: number) => {
          const isSelected = selectedRowIndexes?.[0] === rowGroupIndex
            && selectedRowIndexes?.[1] === rowIndex;
          const cells = [];

          columnValues?.forEach((value: any, cellIndex: number) => {
            const renderFunc = renderRowCellByIndex?.[cellIndex];

            cells.push(
              <Cell
                cellIndex={cellIndex}
                flex={columnFlexNumbers[cellIndex]}
                render={renderFunc}
                rowGroupIndex={rowGroupIndex}
                rowIndex={rowIndex}
                selected={isSelected}
                small={small}
                value={value}
              />,
            );
          });

          const cellEls = (
            <FlexContainer textOverflow>
              {cells}
            </FlexContainer>
          );

          rowsEls.push(
            <RowStyle
              finalRow={numberOfRowGroups - 1 === rowGroupIndex && numberOfRows - 1 === rowIndex}
              hasHover={!!onHoverRow}
              key={`row-group-${key}-row-${rowIndex}`}
              onMouseEnter={() => onHoverRow?.({
                rowGroupIndex,
                rowIndex,
                uuid,
              })}
              selected={isSelected}
            >
              {onClickRow && (
                isTextSelectionRequired
                  ?
                    <TextStyle
                      onClick={() => onClickRow({
                        rowGroupIndex,
                        rowIndex,
                        uuid,
                      })}
                      role="cell"
                    >
                      {cellEls}
                    </TextStyle>
                  :
                    <Link
                      block
                      noHoverUnderline
                      noOutline
                      onClick={() => onClickRow({
                        rowGroupIndex,
                        rowIndex,
                        uuid,
                      })}
                      preventDefault
                    >
                      {cellEls}
                    </Link>
              )}

              {!onClickRow && cellEls}
            </RowStyle>,
          );
        });

        return (
          <div key={key}>
            {titleEl}
            {rowsEls}
          </div>
        );
      })}
    </TableStyle>
  );
}

export default SimpleDataTable;
