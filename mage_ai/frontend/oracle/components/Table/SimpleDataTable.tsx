import { useMemo } from 'react';

import Cell from './Cell';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
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
import { isString, removePercent } from '@utils/string';

export type OnClickRowProps = {
  rowGroupIndex: number;
  rowIndex: number;
  uuid: string;
};

export type ColumnHeaderType = {
  Icon?: any;
  label: string;
  progress?: number;
};

type RowDataType = {
  columnTextColors?: (string | undefined)[]; // An undefined list item will have the default text color
  columnValues: (string | number | boolean | any)[];
  danger?: boolean;
  uuid?: string | number;
};

export type RowGroupDataType = {
  title?: string;
  rowData: RowDataType[];
};

type Warning = {
  name: string;
  compare: (a: number, b: number) => boolean;
  val: number;
};

export type SimpleDataTableProps = {
  columnFlexNumbers: number[];
  columnHeaders: ColumnHeaderType[];
  height?: number;
  isTextSelectionRequired?: boolean;
  noBorder?: boolean;
  noBorderRadius?: boolean; // noBorder takes priority if there's a conflict
  onClickRow?: (opts: OnClickRowProps) => void;
  onHoverRow?: (opts: OnClickRowProps) => void;
  renderRowCellByIndex?: {
    [key: number]: (rowCellData: string | number, i18n: any) => any;
  };
  rowGroupData: RowGroupDataType[];
  selectedRowIndexes?: number[];
  small?: boolean;
  flex?: boolean;
  warnings?: Warning[];
};

function SimpleDataTable({
  columnFlexNumbers,
  columnHeaders,
  height,
  isTextSelectionRequired,
  noBorder,
  noBorderRadius,
  onClickRow,
  onHoverRow,
  renderRowCellByIndex,
  rowGroupData = [],
  selectedRowIndexes,
  small,
  flex,
  warnings = [],
}: SimpleDataTableProps) {
  const numberOfRowGroups = useMemo(() => rowGroupData.length, [rowGroupData]);

  return (
    <TableStyle
      flex={flex}
      height={height}
      noBorder={noBorder}
      noBorderRadius={noBorderRadius}
      noScrollbarTrackBackground
    >
      <ColumnHeaderRowStyle noBorder={noBorder} noBorderRadius={noBorderRadius}>
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
                    <Text bold>
                      {key}
                    </Text>
                  </FlexContainer>
                </ColumnHeaderCellStyle>
              </Flex>
            );
          })}
        </FlexContainer>
      </ColumnHeaderRowStyle>

      {rowGroupData && rowGroupData.map(({
        title,
        rowData,
      }: RowGroupDataType, rowGroupIndex: number) => {
        const key = title || rowGroupIndex;
        const rowsEls = [];
        let titleEl;

        if (title) {
          titleEl = (
            <RowTitleStyle small={small}>
              <Text bold>
                {title}
              </Text>
            </RowTitleStyle>
          );
        }

        const numberOfRows = rowData?.length;
        rowData?.forEach(({
          columnTextColors,
          columnValues,
          danger,
          uuid,
        }: {
          columnTextColors: (string | undefined)[];
          columnValues: (string | number | any)[];
          danger: boolean;
          uuid: string;
        }, rowIndex: number) => {
          const isSelected = selectedRowIndexes?.[0] === rowGroupIndex
            && selectedRowIndexes?.[1] === rowIndex;
          const cells = [];

          const warning = warnings.find(warn => warn.name === columnValues[0]);
          const val = warning && isString(columnValues[1]) ? removePercent(columnValues[1]) : columnValues[1];
          const shouldWarn = warning && warning.compare(val, warning.val);

          columnValues?.forEach((value: any, cellIndex: number, arr: []) => {
            const renderFunc = renderRowCellByIndex?.[cellIndex];
            const textColor = columnTextColors ? columnTextColors[cellIndex] : undefined;
            if (Array.isArray(value)) {
              cells.push(
                <Cell
                  cellIndex={cellIndex}
                  flex={columnFlexNumbers[cellIndex]}
                  key={cellIndex}
                  render={renderFunc}
                  rowGroupIndex={rowGroupIndex}
                  rowIndex={rowIndex}
                  selected={isSelected}
                  showBackground={rowIndex % 2 === 1}
                  showProgress={value[0]}
                  small={small}
                  textColor={textColor}
                  value={value[1]}
                />,
              );
            } else if (typeof value === 'undefined') {
              cells.pop();
              cellIndex = arr.length + 1;
              cells.push(
                <Cell
                  cellIndex={cellIndex}
                  danger={danger}
                  flex={columnFlexNumbers[cellIndex]}
                  key={cellIndex}
                  render={renderFunc}
                  rowGroupIndex={rowGroupIndex}
                  rowIndex={rowIndex}
                  selected={isSelected}
                  showBackground={rowIndex % 2 === 1}
                  small={small}
                  textColor={textColor}
                  value={value}
                  vanish={true}
                />,
              );
            } else {
              cells.push(
                <Cell
                  cellIndex={cellIndex}
                  danger={shouldWarn || danger}
                  flex={columnFlexNumbers[cellIndex]}
                  key={cellIndex}
                  render={renderFunc}
                  rowGroupIndex={rowGroupIndex}
                  rowIndex={rowIndex}
                  selected={isSelected}
                  showBackground={rowIndex % 2 === 1}
                  small={small}
                  textColor={textColor}
                  value={value}
                />,
              );
            }
          });

          const cellEls = (
            <FlexContainer textOverflow>
              {cells}
            </FlexContainer>
          );

          rowsEls.push(
            <RowStyle
              finalRow={(numberOfRowGroups - 1 === rowGroupIndex) && (numberOfRows - 1 === rowIndex)}
              hasHover={!!onHoverRow}
              key={`row-group-${key}-row-${rowIndex}`}
              noBorder={noBorder}
              noBorderRadius={noBorderRadius}
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
