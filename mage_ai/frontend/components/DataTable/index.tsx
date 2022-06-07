import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import scrollbarWidth from './scrollbarWidth';
import styled from 'styled-components';
import { FixedSizeList } from 'react-window';
import {
  useBlockLayout,
  useTable,
} from 'react-table';
import { useSticky } from 'react-table-sticky';

import light from '@oracle/styles/themes/light';

type DataTableProps = {
  columns: string[];
  rows: string[][] | number[][];
}

const Styles = styled.div`
  padding: 1rem;

  .table {
    display: inline-block;
    border-spacing: 0;
    border: 1px solid black;

    .tr {
      :last-child {
        .td {
          border-bottom: 0;
        }
      }
    }

    .th,
    .td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;

      ${props => `
        background-color: ${(props.theme.monotone || light.monotone).grey100};
      `}

      :last-child {
        border-right: 1px solid black;
      }
    }

    &.sticky {
      overflow: auto;
    }

    .header {
      overflow: hidden;
    }
  }
`

function Table({ columns, data }) {
  const refHeader = useRef(null);
  const refListOuter = useRef(null);
  // Use the state and functions returned from useTable to build your UI

  useEffect(() => {
    const onScrollCallback = (e) => {
      console.log(e.target.scrollLeft);

      refHeader.current.scroll(e.target.scrollLeft, 0);
    };

    if (refListOuter) {
      refListOuter.current.addEventListener('scroll', onScrollCallback);
    }

    return () => {
      refListOuter.current.removeEventListener('scroll', onScrollCallback)
    }
  }, [
    refHeader,
    refListOuter
  ]);

  const defaultColumn = React.useMemo(
    () => ({
      width: 150,
    }),
    []
  )

  const scrollBarSize = React.useMemo(() => scrollbarWidth(), [])

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    totalColumnsWidth,
    prepareRow,
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
    },
    useBlockLayout,
    useSticky,
  );

  const RenderRow = React.useCallback(
    ({ index, style }) => {
      const row = rows[index]
      prepareRow(row)
      const { original } = row;
      return (
        <div
          {...row.getRowProps({
            style: {
              ...style,
              width: 'auto',
            },
          })}
          className="tr"
        >
          {row.cells.map((cell, idx: number) => {
            const cellProps = cell.getCellProps();
            const cellStyle = {
              ...cellProps.style,
            };
            if (idx === 0) {
              cellStyle.left = 0;
              cellStyle.position = 'sticky';
            }

            return (
              <div
                {...cellProps}
                className="td"
                style={cellStyle}
              >
                {idx === 0 && cell.render('Cell')}
                {idx >= 1 && original[idx - 1]}
              </div>
            )
          })}
        </div>
      )
    },
    [prepareRow, rows]
  )

  // Render the UI for your table
  return (
    <div
      {...getTableProps()}
      className="table sticky"
      style={{
        width: 800 + scrollBarSize,
      }}
    >

      <div {...getTableBodyProps()} className="body">
        <div
          className="header"
          ref={refHeader}
        >
          {headerGroups.map(headerGroup => (
            <div
              {...headerGroup.getHeaderGroupProps()}
              className="tr"
            >
              {headerGroup.headers.map(column => (
                <div {...column.getHeaderProps()} className="th">
                  {column.render('Header')}
                </div>
              ))}
            </div>
          ))}
        </div>


        <FixedSizeList
          height={400}
          itemCount={rows.length}
          itemSize={35}
          // width={totalColumnsWidth + scrollBarSize}
          outerRef={refListOuter}
          style={{
            overflow: 'auto',
          }}
        >
          {RenderRow}
        </FixedSizeList>
      </div>
    </div>
  )
}

function App({
  columns: columnsProp,
  rows: rowsProp,
}) {
  // const columns = React.useMemo(
  //   () => [
  //     {
  //       Header: 'Row Index',
  //       accessor: (row, i) => i,
  //     },
  //     {
  //       Header: 'Name',
  //       columns: [
  //         {
  //           Header: 'First Name',
  //           accessor: 'firstName',
  //         },
  //         {
  //           Header: 'Last Name',
  //           accessor: 'lastName',
  //         },
  //       ],
  //     },
  //     {
  //       Header: 'Info',
  //       columns: [
  //         {
  //           Header: 'Age',
  //           accessor: 'age',
  //           width: 50,
  //         },
  //         {
  //           Header: 'Visits',
  //           accessor: 'visits',
  //           width: 60,
  //         },
  //         {
  //           Header: 'Status',
  //           accessor: 'status',
  //         },
  //         {
  //           Header: 'Profile Progress',
  //           accessor: 'progress',
  //         },
  //       ],
  //     },
  //   ],
  //   []
  // )

  // const data = React.useMemo(() => makeData(100000), [])



  const columns = React.useMemo(() => [{
    Header: 'Row index',
    accessor: (row, i) => i,
    sticky: 'left',
  }].concat(columnsProp?.map(col => ({
    Header: col,
    accessor: col,
  }))), [columnsProp]);

  const data = React.useMemo(() => rowsProp?.map(row => row.reduce((acc, v, i) => ({
    ...acc,
    [columnsProp[i]]: v,
  }), {})), [
    columnsProp,
    rowsProp,
  ]);

  return (
    <Styles>
      <Table columns={columns} data={rowsProp} />
    </Styles>
  )
}

export default App
