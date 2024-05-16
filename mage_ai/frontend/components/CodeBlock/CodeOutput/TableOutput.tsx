import InnerHTML from 'dangerously-set-html-content';
import { useEffect, useMemo } from 'react';

import DataTable from '@components/DataTable';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { HTMLOutputStyle } from './index.style';
import { OutputType, SampleDataType } from '@interfaces/BlockType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { containsOnlySpecialCharacters, containsHTML } from '@utils/string';
import { isObject } from 'utils/hash';

type TableOutputProps = {
  containerWidth?: number;
  dataInit?: {
    multi_output?: boolean;
    uuid?: string;
  };
  order?: number;
  output: OutputType;
  setShapeCallback?: (shape: number[]) => void;
  borderTop?: boolean;
  multiOutputInit?: boolean;
  selected?: boolean;
  uuid?: string;
};

function TableOutput({
  borderTop,
  containerWidth,
  order,
  output,
  selected,
  setShapeCallback,
  uuid,
}: TableOutputProps) {
  const { data, sample_data: sampleData, shape } = output;

  const {
    columns,
    rows,
  }: {
    columns: string[];
    rows: string[][] | number[][];
  } = useMemo(
    () =>
      (isObject(data)
        && typeof sampleData !== 'string'
        && !Array.isArray(sampleData)
        ? data as SampleDataType
        : null
      )
      || (isObject(sampleData)
        && sampleData?.rows
        && sampleData?.columns
          ? sampleData
          : null
      )
      || {
          columns: [],
          rows: [],
        },
    [data, sampleData],
  );

  useEffect(() => {
    if (shape && setShapeCallback) {
      setShapeCallback?.(shape);
      if (uuid) {
        // @ts-ignore
        setShapeCallback((prev: number[]) => ({
          ...prev,
          [uuid]: shape,
        }));
      }
    }
  }, [setShapeCallback, shape, uuid]);

  if (columns?.some(header => header === '')) {
    return (
      <Spacing mx={5} my={3}>
        <Text monospace warning>
          Block output table could not be rendered due to empty string headers. Please check your
          data’s column headers for empty strings.
        </Text>
      </Spacing>
    );
  }

  if (
    Array.isArray(rows)
    && rows.length >= 1
    // @ts-ignore
    && rows.every(row => Array.isArray(row) && row.every(cell => typeof cell === 'string' && containsHTML(cell)))
  ) {
    return (
      <Spacing pb={PADDING_UNITS} px={PADDING_UNITS}>
        <HTMLOutputStyle monospace>
          {rows.map((row, idx) =>
            <div key={`html-row-${idx}`}>
              {row.map((cell, cellIdx) => (
                <InnerHTML html={String(cell)} key={`html-cell-${cellIdx}`} />
              ))}
            </div>,
          )}
        </HTMLOutputStyle>
      </Spacing>
    );
  }

  return (
    <DataTable
      columns={columns}
      disableScrolling={!selected}
      key={`data-table-${order}`}
      maxHeight={UNIT * 60}
      noBorderBottom
      noBorderLeft
      noBorderRight
      noBorderTop={!borderTop}
      renderColumnHeaderCell={(
        { Header: columnName },
        _,
        {
          index: columnIndex,
          key: columnKey,
          props: columnProps,
          style: columnStyle,
          // width: columnWidth,
        },
      ) => {
        const empty = columnName?.length === 0 || containsOnlySpecialCharacters(columnName);
        return (
          <div
            {...columnProps}
            className="th"
            key={columnKey}
            style={{
              ...columnStyle,
              paddingBottom: 0,
              paddingTop: 0,
            }}
            title={columnIndex ? 'Row number' : undefined}
          >
            <FlexContainer alignItems="center" fullHeight fullWidth>
              <Text disabled monospace small>
                {empty ? '' : columnName}
              </Text>
            </FlexContainer>
          </div>
        );
      }}
      rows={rows}
      // Remove border 2px and padding from each side
      width={
        containerWidth
          ? containerWidth - (2 + PADDING_UNITS * UNIT * 2 + 2 + SCROLLBAR_WIDTH)
          : null
      }
    />
  );
}

export default TableOutput;
