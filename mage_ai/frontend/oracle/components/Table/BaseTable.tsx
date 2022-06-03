import React, { useEffect, useMemo, useState } from 'react';
import { useAbsoluteLayout, useBlockLayout, useFlexLayout, useTable } from 'react-table';
import { TextStyle } from './index.style';
import Text from '@oracle/elements/Text';

import { DataTableColumn, DataTableRow } from './types';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { TableStyle, RowCellStyle, CellStyled } from './Table.style';
import { cutTextSize, getColumnWidth } from './helpers';

  export type DataTableProps = {
    children?: any;
    columns: DataTableColumn[];
    data: DataTableRow<any>[];
    titles: string[];
    datatype: string[];
  };

  export type rowMapping = {
    [key: string]: any;
  };

  function BaseTable({
    columns,
    data,
    titles,
    datatype,
  }: any) {

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
    totalColumnsWidth,
  } = useTable(
    {
      columns: column || columnSample,
      data: row || dataSample,
    },
    useAbsoluteLayout,
    );

  // TODO: Base template, add styling later. Cell styling is only for selected. Skip for now.
  return (
    // Table: Relative, no overflow, outline in silver
    <TableStyle>
      <table 
          {...getTableProps()}
          style={{
            border: 'solid 1px #D8DCE3',
            borderRadius: `${BORDER_RADIUS_LARGE}px`,
            width: totalColumnsWidth,
          }}
        >
        {/* Column: sticky. overflow y only, bold, silver, borders on everything but bottom. Filled background */}
        <thead>
          { headerGroups.map(headerGroup => (
            // eslint-disable-next-line react/jsx-key
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                // eslint-disable-next-line react/jsx-key
                <th
                  {...column.getHeaderProps()}
                  style={{
                    background: '#F9FAFC',
                    border: 'solid 1px #D8DCE3',
                    maxWidth: `${getColumnWidth(rows, column.id)}px`,
                    minWidth: column.minWidth,
                    padding: '14px',
                    position: 'sticky',
                  }}
                >
                  {/* <RowCellStyle width={totalColumnsWidth}> */}
                  <TextStyle>
                    <Text bold leftAligned>
                      {column.render('Header')}
                    </Text>
                  </TextStyle>
                  {/* </RowCellStyle> */}
                </th>
                  ))}
            </tr>
            ))}

        </thead>
        {/* Rows: relative, overflow, black text, borders on everything but bottom except for last, skip bg */}
        <tbody {...getTableBodyProps()}>
          {rows.map((row, i) => {
              prepareRow(row);
              return (
                // eslint-disable-next-line react/jsx-key
                <tr {...row.getRowProps()}>
                  {row.cells.map(cell => (
                    // eslint-disable-next-line react/jsx-key
                    <td
                      {...cell.getCellProps()}
                      style={{
                        background: (i % 2 === 1) ? '#F9FAFC' : '#FBFCFD',
                        border: 'solid 1px #FBFCFD',
                        borderLeft: 'none',
                        borderRight: 'none',
                        maxWidth: `${getColumnWidth(rows, cell.column.id)}px`,
                        minWidth: cell.column.width,
                        padding: '14px',
                      }}
                    >
                      {/* <CellStyled> */}
                      <TextStyle>
                        <Text>
                          {cell.render('Cell')}
                        </Text>
                      </TextStyle>
                      {/* </CellStyled> */}
                    </td>
                    ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </TableStyle>
  );
}

export default BaseTable;
