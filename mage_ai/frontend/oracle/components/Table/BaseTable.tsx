/* eslint-disable react/jsx-key */
import React, { useMemo } from 'react'
import { useTable } from 'react-table'


import { DataTableColumn, DataTableRow } from './types';

  export type DataTableProps = {
    children?: any;
    columns: DataTableColumn[]
    data: DataTableRow<any>[]
  };

  function BaseTable({
    children,
    columns,
    data,
  }: any) {
  
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
        accessor: 'col1', // accessor is the "key" in the data
      },
      {
        Header: 'Column 2',
        accessor: 'col2',
      },
    ],
    [],
  );

  // Parse into the form
  const column = columns.map(({
    Icon,
    label,
  }: any, idx: number) => {
    const key = label;
  });
    
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({ columnSample, dataSample })

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
