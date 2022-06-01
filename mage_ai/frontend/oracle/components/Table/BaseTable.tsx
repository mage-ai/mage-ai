/* eslint-disable react/jsx-key */
import React, { useEffect, useMemo, useState} from 'react'
import { useBlockLayout, useTable } from 'react-table'
import { TextStyle } from './index.style';
import Text from '@oracle/elements/Text';

import { DataTableColumn, DataTableRow } from './types';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
// import { TableStyle, ColumnHeaderRowStyle, RowCellStyle, CellStyled } from './Table.style';

  export type DataTableProps = {
    children?: any;
    columns: DataTableColumn[]
    data: DataTableRow<any>[]
  };

  function BaseTable({
    children,
    columnHeaders,
    rowGroupData,
    columnTitles,
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
    if (columnHeaders) {
      const headers = [];
      columnHeaders.map(({label='none'}, i) => {
        const rowValues =
          {
            Header: label,
            accessor: columnTitles[i],
          }
        headers.push(rowValues);
      });
      setColumn(headers);
    }
  }, [columnHeaders, columnTitles]);

    useEffect(() => {
      if (rowGroupData) {
        const values = [];
        rowGroupData.map((rows) => {
          const rowValues = {};
          rows.map((cell, j) => {
            const key = columnTitles[j];
            !(key in rowValues) && (rowValues.key = {})
            rowValues[key] = cell;
          });
          values.push(rowValues);
        });
        setRow(values);
      }
    }, [columnTitles, rowGroupData]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable(
    { 
      columns: column || columnSample,
      data: row || dataSample,
    },
    // useBlockLayout,
    );

  // TODO: Base template, add styling later. Cell styling is only for selected. Skip for now.
  return (
    // Table: Relative, no overflow, outline in silver
    // <TableStyle>
    <table 
        {...getTableProps()}
        style={{
          border: 'solid 1px #D8DCE3',
          borderRadius: `${BORDER_RADIUS_LARGE}px`,
        }}
      >
      {/* <ColumnHeaderRowStyle> */}
      {/* Column: sticky. overflow y only, bold, silver, borders on everything but bottom. Filled background */}
      <thead>
        { headerGroups.map(headerGroup => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
              <th
                    {...column.getHeaderProps()}
                    style={{
                      background: '#F9FAFC',
                      border: 'solid 1px #D8DCE3',
                    }}
                  >
                <TextStyle>
                  <Text bold>
                    {column.render('Header')}
                  </Text> 
                </TextStyle>
              </th>
                ))}
          </tr>
          ))}
      </thead>
      {/* </ColumnHeaderRowStyle> */}
      {/* Rows: relative, overflow, black text, borders on everything but bottom except for last, skip bg */}
      {/* <RowCellStyle> */}
      <tbody {...getTableBodyProps()}>
        {rows.map(row => {
            prepareRow(row)
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => (
                  <td
                    {...cell.getCellProps()}
                    style={{
                      background: '#FBFCFD',
                      border: 'solid 1px #FBFCFD',
                      borderLeft: 'none',
                      borderRight: 'none',
                      padding: '10px',
                     }}
                  >
                    <TextStyle>
                      <Text>
                        {cell.render('Cell')}
                      </Text>
                    </TextStyle>
                  </td>
                  ))}
              </tr>
            )
          })}
      </tbody>
      {/* </RowCellStyle> */}
    </table>
    // </TableStyle>
  );
}

export default BaseTable;
