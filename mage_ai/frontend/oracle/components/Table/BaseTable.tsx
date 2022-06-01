/* eslint-disable react/jsx-key */
import React, { useEffect, useMemo, useState} from 'react'

import { useBlockLayout, useTable } from 'react-table'


import { DataTableColumn, DataTableRow } from './types';
import Text from '@oracle/elements/Text';

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
  const [row, setRow] = useState();

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
      console.log('Parsed:', headers);
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
        console.log('Parsed Rows:', values);
      }
    }, [columnTitles, rowGroupData]);

  console.log('Sample:', columnSample);
  console.log('Row group data', rowGroupData)

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
    useBlockLayout,
    );

  // TODO: Base template, add styling later.
  return (
    <table {...getTableProps()} style={{ border: 'solid 1px blue' }}>
      <thead>
        {
        headerGroups.map(headerGroup => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
              <th
                {...column.getHeaderProps()}
                style={{
                  background: 'aliceblue',
                  borderBottom: 'solid 3px red',
                  color: 'black',
                  fontWeight: 'bold',
                }}
              >
                {column.render('Header')}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {rows.map(row => {
           prepareRow(row)
           return (
             <tr {...row.getRowProps()}>
               {row.cells.map(cell => (
                 <td
                     {...cell.getCellProps()}
                     style={{
                      background: 'papayawhip',
                      border: 'solid 1px gray',
                      padding: '10px',
                     }}
                   >
                   {cell.render('Cell')}
                 </td>
                 ))}
             </tr>
           )
         })}
      </tbody>
    </table>
  );
}

export default BaseTable;
