import React, { useEffect, useMemo, useState } from 'react';
import { useTable } from 'react-table';
import { TextStyle } from './index.style';
import Text from '@oracle/elements/Text';

import { DataTableColumn, DataTableRow } from './types';
import { TableStyle } from './Table.style';
import { cutTextSize } from './helpers';

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
  } = useTable(
    {
      columns: column || columnSample,
      data: row || dataSample,
    },
    );

  // TODO: Base template, add styling later. Cell styling is only for selected. Skip for now.
  return (
    // Table: Relative, no overflow, outline in silver
    <TableStyle>
      <table
          {...getTableProps()}
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
                    padding: '4px',
                  }}
                >
                  <TextStyle>
                    <Text bold leftAligned>
                      {column.render('Header')}
                    </Text>
                  </TextStyle>
                </th>
                  ))}
            </tr>
            ))}

        </thead>
        {/* Rows: relative, overflow, black text, borders on everything but bottom except for last, skip bg */}
        <tbody {...getTableBodyProps()}>
          {rows.map((row, i, arr) => {
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
                        borderBottom: (i === arr.length - 1) ? 'solid 1px #D8DCE3' : 'none',
                        borderLeft: 'solid 1px #D8DCE3',
                        borderRight: 'solid 1px #D8DCE3',
                        borderSpacing: 0,
                        borderTop: 'none',
                        padding: '4px',
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
              );
            })}
        </tbody>
      </table>
    </TableStyle>
  );
}

export default BaseTable;
