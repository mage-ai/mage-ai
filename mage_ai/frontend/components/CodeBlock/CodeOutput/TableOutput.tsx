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
import { containsOnlySpecialCharacters, containsHTML, pluralize } from '@utils/string';
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
  maxHeight?: number;
  multiOutputInit?: boolean;
  selected: boolean;
  uuid?: string;
};

function TableOutput({
  borderTop,
  containerWidth,
  maxHeight,
  order,
  output,
  selected,
  setShapeCallback,
  uuid,
}: TableOutputProps) {
  const { data, resource_usage: resourceUsage, sample_data: sampleData } = output;
  const shape = useMemo(
    // @ts-ignore
    () =>
      (
        (output?.data && isObject(output?.data)
          ? // @ts-ignore
            output?.data?.shape
          : null) || output?.shape
      )?.filter(v => v !== null && typeof v !== 'undefined'),
    [output],
  );

  const {
    columns,
    rows,
  }: {
    columns: string[];
    rows: string[][] | number[][];
  } = useMemo(
    () =>
      (isObject(data) && typeof sampleData !== 'string' && !Array.isArray(sampleData)
        ? (data as SampleDataType)
        : null) ||
      (isObject(sampleData) && sampleData?.rows && sampleData?.columns ? sampleData : null) || {
        columns: [],
        rows: [],
      },
    [data, sampleData],
  );

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
    Array.isArray(rows) &&
    rows.length >= 1 &&
    // @ts-ignore
    rows.every(
      row =>
        Array.isArray(row) && row.every(cell => typeof cell === 'string' && containsHTML(cell)),
    )
  ) {
    return (
      <Spacing pb={PADDING_UNITS} px={PADDING_UNITS}>
        <HTMLOutputStyle monospace>
          {rows.map((row, idx) => (
            <div key={`html-row-${idx}`}>
              {row.map((cell, cellIdx) => (
                <InnerHTML html={String(cell)} key={`html-cell-${cellIdx}`} />
              ))}
            </div>
          ))}
        </HTMLOutputStyle>
      </Spacing>
    );
  }

  if (!columns?.length) {
    return (
      <Spacing mx={5} my={3}>
        <Text monospace warning>
          Block output table could not be rendered due to missing column headers. Please check your
          data’s column headers.
        </Text>
      </Spacing>
    );
  }

  const resourcesDisplay = useMemo(() => {
    const arr1 = [];
    const arr2 = [];

    if (shape?.length >= 1) {
      const r = pluralize('row', shape?.[0]);
      if (shape?.length >= 2) {
        const c = pluralize('column', shape?.[1]);
        arr1.push(`${r} x ${c}`);
      } else {
        arr1.push(r);
      }
    }

    if (resourceUsage) {
      if (typeof resourceUsage?.size !== 'undefined' && resourceUsage?.size !== null) {
        arr2.push(`Size: ${(resourceUsage?.size / 1024 ** 2).toFixed(2)}MB`);
      }
      if (
        typeof resourceUsage?.memory_usage !== 'undefined' &&
        resourceUsage?.memory_usage !== null
      ) {
        arr2.push(`Memory: ${(resourceUsage?.memory_usage / 1024 ** 2).toFixed(2)}MB`);
      }
    }

    return (
      <>
        <Text monospace muted small>
          {arr1?.map((text: string, idx: number) => (
            <span key={text}>
              {idx >= 1 && <>&nbsp;/&nbsp;</>}
              {text}
            </span>
          ))}
        </Text>
        <Text monospace muted small>
          {arr2?.map((text: string, idx: number) => (
            <span key={text}>
              {idx >= 1 && <>&nbsp;/&nbsp;</>}
              {text}
            </span>
          ))}
        </Text>
      </>
    );
  }, [shape, resourceUsage]);

  return (
    <>
      <DataTable
        columns={columns}
        disableScrolling={!selected}
        key={`data-table-${order}`}
        maxHeight={maxHeight || UNIT * 60}
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
      <Spacing pb={1} px={PADDING_UNITS}>
        {resourcesDisplay}
      </Spacing>
    </>
  );
}

export default TableOutput;
