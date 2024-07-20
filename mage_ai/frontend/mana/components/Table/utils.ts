import List from '@mana/elements/List';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import scrollbars from '@mana/styles/scrollbars';
import styled from 'styled-components';
import { PaddingEnum } from '@mana/themes/padding';
import { RectType } from '@mana/shared/interfaces';
import { TAB_REPORTS } from '@components/datasets/overview/constants';
import { TableHeaderProps, useBlockLayout, useTable } from 'react-table';
import { UNIT } from '@mana/themes/spaces';
import { VariableSizeList } from 'react-window';
import { VariableTypeEnum } from '@interfaces/CodeExecutionType';
import { createDatasetTabRedirectLink } from '@components/utils';
import { hashCode, isJsonString } from '@utils/string';
import { isObject } from '@utils/hash';
import { randomSample, range, sum, transpose, flattenArray } from '@utils/array';
import { useSticky } from 'react-table-sticky';

export const BASE_ROW_HEIGHT = 20;
export const DEFAULT_COLUMN_WIDTH = BASE_ROW_HEIGHT;
export const WIDTH_OF_SINGLE_CHARACTER_REGULAR_SM = 10;
export const MIN_WIDTH = 100;

export function estimateCellHeight({
  original,
  values,
}: {
  original: (string | number | (string | number)[])[];
  values: {
    [key: string]: string | number | (string | number)[];
  };
}, {
  columnWidths,
  indexes,
}: {
  columnWidths: number[];
  indexes: number[];
}) {
  const heights = [];

  if (Array.isArray(original)) {
    let hoffset = 0;

    original.forEach((val, idx) => {
      const wLimit = columnWidths[idx + indexes[idx]];

      const numberOfLines = [];
      let woffset = 0;

      const vals = [];
      if (Array.isArray(val)) {
        let hasObject = false;

        vals.push(...val.map(v => {
          let val2 = v;

          if (isObject(v)) {
            val2 = JSON.stringify(v, null, 2);
            hasObject = true;
          }

          return String(val2).split('\n');
        }));

        // Border top and vertical padding
        hoffset += (val.length * (PaddingEnum.XS * 2)) + 1;
        woffset += hasObject ? 0 : PaddingEnum.LG * 2;
      } else {
        vals.push(...String(val).split('\n'));
      }

      const ws = [];
      vals.forEach((v) => {
        const nlines = [];
        const wsinner = [];
        (Array.isArray(v) ? v : [v]).forEach((v2) => {
          const wTotal = (String(v2).length * WIDTH_OF_SINGLE_CHARACTER_REGULAR_SM) + woffset;
          wsinner.push(wTotal);
          nlines.push(Math.ceil(wTotal / wLimit));
        });

        ws.push(wsinner);
        numberOfLines.push(nlines);
      });

      heights.push((sum(flattenArray(numberOfLines)) * BASE_ROW_HEIGHT) + hoffset);

      // console.log(idx, val, vals, wLimit, numberOfLines, ws, heights, heights[idx]);
    });
  }

  const height = Math.max(...heights, BASE_ROW_HEIGHT) + (PaddingEnum.XS * 2) + 2;

  // console.log(original, height, heights);

  return height;
}

export function getVariableListHeight(
  rows: {
    original: (string | number | (string | number)[])[];
    values: {
      [key: string]: string | number | (string | number)[];
    };
  }[],
  {
    columnWidths,
    indexes,
  }: {
    columnWidths: number[];
    indexes: number[];
  },
) {
  return sum(rows.map((row) => estimateCellHeight(row, {
    columnWidths,
    indexes,
  })));
}

export function buildIndexColumns(
  numberOfIndexes: number,
  opts: {
    disableZeroIndexRowNumber?: boolean;
  } = {},
): Column[] {
  return range(numberOfIndexes).map((i: number, idx: number) => ({
    Header: range(idx + 1)
      .map(() => ' ')
      .join(' '),
    accessor: (_: any, indexNumber: number) =>
      String(indexNumber + (opts?.disableZeroIndexRowNumber ? 1 : 0)),
    index: true,
    sticky: 'left',
  }));
}
