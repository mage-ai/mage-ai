import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAbsoluteLayout, useTable } from 'react-table';

import Text from '@oracle/elements/Text';
import { DataTableColumn, DataTableRow } from './types';
import {
  TableBodyStyle,
  TableHeadStyle,
  TableRowStyle,
  TableStyle,
} from './Table.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { cutTextSize } from './helpers';

export type DataTableProps = {
  children?: any;
  columns: DataTableColumn[];
  data: DataTableRow<any>[];
  datatype: string[];
  offsetWidth?: number;
  titles: string[];
  width?: number;
};

export type rowMapping = {
  [key: string]: any;
};

function BaseTable({
  columns,
  data,
  datatype,
  offsetWidth,
  titles,
  width: widthProp,
}: any) {
  const refTable = useRef(null);
  const [column, setColumn] = useState([]);
  const [row, setRow] = useState([]);

  // Keep these samples in due to undefined errors.
  const dataSample = useMemo(
    () => [
      {
        col1: 'Hello',
        col2: 'World',
      },
      {
        col1: 'react-table',
        col2: 'rocks',
      },
      {
        col1: 'whatever',
        col2: 'you want',
      },
    ],
    [],
  );

  const columnSample = useMemo(
    () => [
      {
        Header: 'Column 1',
        accessor: 'col1',
      },
      {
        Header: 'Column 2',
        accessor: 'col2',
      },
    ],
    [],
  );

  useEffect(() => {
    if (columns) {
      const headers = [];
      columns.map(({ label='none' }: any, i: string | number) => {
        const rowValues =
          {
            Header: (datatype) ? `${cutTextSize(label)} (${datatype[i]})` : cutTextSize(label),
            accessor: titles[i],
          };
        headers.push(rowValues);
      });
      setColumn(headers);
    }
  }, [columns, titles, datatype]);

    useEffect(() => {
      if (data) {
        const values = [];
        data.map((rows: any[]) => {

          const rowValues:rowMapping = {};
          rows.map((cell, j) => {
            const key = titles[j];
            !(key in rowValues) && (rowValues.key = {});
            rowValues[key] = cutTextSize(cell);
          });
          values.push(rowValues);
        });
        setRow(values);
      }
    }, [titles, data]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    totalColumnsWidth: totalColumnsWidthInitial,
  } = useTable(
    {
      columns: column || columnSample,
      data: row || dataSample,
    },
    useAbsoluteLayout,
    );

  const totalColumnsWidth = widthProp
    ? widthProp
    : totalColumnsWidthInitial - (offsetWidth || 0);
  const tableContainerWidth = refTable?.current?.getBoundingClientRect?.()?.width || 0;

  return (
    // Table: Relative, no overflow, outline in silver
    <TableStyle
      ref={refTable}
      width={(widthProp || offsetWidth) ? totalColumnsWidth : null}
    >
      <table
          {...getTableProps()}
          style={{
            width: Math.max(totalColumnsWidth, tableContainerWidth - 2),
          }}
        >
        {/* Column: sticky. overflow y only, bold, silver, borders on everything but bottom. Filled background */}
        <TableHeadStyle>
          { headerGroups.map(headerGroup => (
            // eslint-disable-next-line react/jsx-key
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column, i) => (
                // eslint-disable-next-line react/jsx-key
                <th {...column.getHeaderProps()}
                style={{
                  // maxWidth: `${getColumnWidth(rows, column.id)}px`,
                  // minWidth: column.minWidth,
                }}>
                  <Text bold leftAligned maxWidth={UNIT * 25} title={titles[i]}>
                    {column.render('Header')}
                  </Text>
                </th>
                  ))}
            </tr>
            ))}

        </TableHeadStyle>
        {/* Rows: relative, overflow, black text, borders on everything but bottom except for last, skip bg */}
        <TableBodyStyle {...getTableBodyProps()}>
          {rows.map((row, i) => {
            prepareRow(row);

            return (
              // eslint-disable-next-line react/jsx-key
              <TableRowStyle {...row.getRowProps()} showBackground={i % 2 === 1} >
                {row.cells.map((cell, j) => {
                  const { value: cellValue } = cell;

                  return (
                    // eslint-disable-next-line react/jsx-key
                    <td
                      {...cell.getCellProps()}
                      style={{
                        // maxWidth: `${getColumnWidth(rows, column.id)}px`,
                        // minWidth: column.minWidth,
                      }}
                    >
                      <Text maxWidth={UNIT * 25} title={data?.[i]?.[j]?.toString()} wordBreak>
                        {cellValue === true && 'true'}
                        {cellValue === false && 'false'}
                        {(cellValue === null || cellValue === 'null') && 'null'}
                        {cellValue !== true
                          && cellValue !== false
                          && cellValue !== null
                          && cellValue !== 'null'
                          && cellValue
                        }
                      </Text>
                    </td>
                  );
                })}
              </TableRowStyle>
            );
          })}
        </TableBodyStyle>
      </table>
    </TableStyle>
  );
}

export default BaseTable;
