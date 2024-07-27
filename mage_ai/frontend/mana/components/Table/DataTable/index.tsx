import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Row from '../Row';
import { Column } from '../interfaces';
import { ContainerStyled } from './index.style';
import { PaddingEnum } from '@mana/themes/padding';
import { RectType } from '@mana/shared/interfaces';
import { SCROLLBAR_TRACK_WIDTH } from '../../../themes/scrollbars';
import { UNIT } from '@mana/themes/spaces';
import { VariableSizeList } from 'react-window';
import { VariableTypeEnum } from '@interfaces/CodeExecutionType';
import { isJsonString } from '@utils/string';
import { isObject } from '@utils/hash';
import { useBlockLayout, useTable } from 'react-table';
import { useSticky } from 'react-table-sticky';
import { estimateCellHeight, getVariableListHeight, buildIndexColumns, BASE_ROW_HEIGHT,
DEFAULT_COLUMN_WIDTH, WIDTH_OF_SINGLE_CHARACTER_REGULAR_SM, MIN_WIDTH} from '../utils';

type SharedProps = {
  boundingBox: RectType;
  rect: RectType
  rows: Row[];
};

type Row = (boolean
  | string
  | number
  | Record<string, string | number | boolean>
  | (string | number)[]
)[];

type TableProps = {
  columns: Column[];
} & SharedProps;

interface ColumnSetting {
  data?: {
    type?: VariableTypeEnum;
  };
  layout?: {
    width?: {
      percentage?: number;
      minimum?: number;
    };
  };
  uuid: string;
}

type DataTableProps = {
  columns: ColumnSetting[];
} & SharedProps;

function Table({ ...props }: TableProps) {
  const {
    boundingBox,
    columns,
    rect,
    rows,
  } = props;

  const { height: maxHeight, width: maxWidth } = boundingBox;
  const { height, width } = rect;

  const refHeader = useRef(null);
  const refListOuter = useRef(null);

  useEffect(() => {
    const onScrollCallback = e => {
      refHeader?.current?.scroll(e.target.scrollLeft, 0);
    };

    if (refListOuter) {
      refListOuter.current.addEventListener('scroll', onScrollCallback);
    }

    const listOuter = refListOuter.current;

    return () => {
      listOuter?.removeEventListener('scroll', onScrollCallback);
    };
  }, [refHeader, refListOuter]);

  const rowCount = useMemo(() => rows.length, [rows]);
  const indexColumnWidth =
    useMemo(() => (String(rowCount).length * WIDTH_OF_SINGLE_CHARACTER_REGULAR_SM) + (PaddingEnum.XS * 2), [rowCount]);

  const indexes =
    columns.reduce((acc, col, idx) => acc.concat(
      (idx === 0 ? 0 : acc[idx - 1]) + (col.index ? 1 : 0),
    ), []);

  const columnWidthsRaw = useMemo(() => {
    const widths = columns.map(() => 0);

    rows.forEach((values, idxRow) => {
      columns.forEach(({ index }, idx) => {
        let val1 = index
          ? String(idxRow)
          : values[idx - indexes[idx]] ?? '';

        // console.log(idx, val1, typeof values[idx], Array.isArray(val1) && val1.some(isObject))

        let size = 0;
        if ((Array.isArray(val1) && val1.some(isObject))) {
          val1?.forEach((val2) => {
            val2 = isObject(val2) ? JSON.stringify(val2, null, 2) : val2;
            String(val2 ?? '').split('\n').forEach((line) => {
              size = Math.max(size, line.trim().length);
            });
          });
        } else if (isJsonString(val1) || isObject(val1)) {
          val1 = isObject(val1) ? JSON.stringify(val1, null, 2) : val1;
          String(val1 ?? '').split('\n').forEach((line) => {
            size = Math.max(size, line.trim().length);
          });
        } else if (typeof val1 === 'string') {
          size = val1.trim().length;
        } else if (Array.isArray(val1)) {
          size = Math.max(...(val1 as string[]).map(v => String(v).trim().length));
          size += PaddingEnum.LG * 2;
        }

        widths[idx] = Math.max(widths[idx], size) + (PaddingEnum.XS * 2);
      });
    });

    return widths;
  }, [columns, indexes, rows]);

  // console.log('columnWidthsRaw', columnWidthsRaw);

  const columnWidths = useMemo(() => {
    let widthOffset = 0;

    const initialWidths = columns.map((col, idx) => {
      if (col.index) {
        widthOffset += indexColumnWidth;
        return indexColumnWidth;
      }

      const width = columnWidthsRaw[idx] * WIDTH_OF_SINGLE_CHARACTER_REGULAR_SM;
      return width < MIN_WIDTH ? MIN_WIDTH : width;
    });

    const totalInitialWidths = initialWidths.reduce((acc, width) => acc + width, 0);
    const remainingWidth = width - widthOffset;
    const scaleFactor = remainingWidth / totalInitialWidths;

    return columns.map((col, idx) => {
      if (col.index) {
        return indexColumnWidth;
      }

      const newWidth = initialWidths[idx] * scaleFactor;
      return newWidth < MIN_WIDTH ? MIN_WIDTH : newWidth;
    });
  }, [columns, columnWidthsRaw, indexColumnWidth, width]);

  const defaultColumn = useMemo(() => {
    const widthAdjusted = width
      - (indexColumnWidth + UNIT * 1.5 + SCROLLBAR_TRACK_WIDTH);

    const numberOfColumns = columnWidths.length - 1;
    let defaultColumnWidth = DEFAULT_COLUMN_WIDTH;

    if (defaultColumnWidth * numberOfColumns < widthAdjusted) {
      defaultColumnWidth = widthAdjusted / numberOfColumns;
    }

    return {
      width: defaultColumnWidth,
    };
  }, [columnWidths, indexColumnWidth, width]);

  const {
    getTableBodyProps, getTableProps, headerGroups, prepareRow, rows: rowsProcessed,
  } = useTable(
    {
      columns,
      data: rows,
      defaultColumn,
    },
    useBlockLayout,
    useSticky,
  );

  const renderRow = useCallback(({ index, style }: { index: number, style: any }) => {
    const row = rowsProcessed[index];
    prepareRow(row);

    return (
      <Row
        columnWidths={columnWidths}
        columns={columns}
        index={index}
        indexes={indexes}
        row={row}
        style={style}
      />
    );
  }, [columnWidths, columns, indexes, prepareRow, rowsProcessed]);

  const variableListMemo = useMemo(
    () => (
      <VariableSizeList
        estimatedItemSize={BASE_ROW_HEIGHT}
        height={getVariableListHeight(rowsProcessed, {
          columnWidths,
          indexes,
        })}
        itemCount={rowCount}
        itemSize={(idx: number) => {
          const size = estimateCellHeight(rowsProcessed[idx], {
            columnWidths,
            indexes,
          });

          return size;
        }}
        outerRef={refListOuter}
        style={{
          overflow: 'visible',
          width: 'auto',
          // width: rect?.width,
        }}
      >
        {renderRow}
      </VariableSizeList>
    ),
    [renderRow, rowCount, rowsProcessed, indexes, columnWidths, rect],
  );

  const headerMemo = useMemo(() => headerGroups.map((headerGroup, groupIdx) => {
    const arr = headerGroup.headers.map((column, idx: number) => {
      const settings = columns[idx];
      const columnProps = column.getHeaderProps();
      const columnStyle: {
        [key: string]: number | string;
      } = {
        ...columnProps.style,
      };

      const colWidth = columnWidths[idx];
      columnStyle.minWidth = colWidth;
      columnStyle.padding = 'var(--padding-xs)';
      columnStyle.width = colWidth;

      if (settings.index) {
        columnStyle.fontFamily = 'var(--fonts-family-monospace-regular)';
        columnStyle.left = 0;
        columnStyle.position = 'sticky';
        columnStyle.textAlign = 'center';
      }

      const el = column.render('Header');

      return (
        <div
          {...columnProps}
          className="th th-monospace"
          key={column.id}
          style={columnStyle}
          title={settings.index ? 'Row number' : undefined}
        >
          {el}
        </div>
      );
    });

    return (
      <div
        {...headerGroup.getHeaderGroupProps()}
        className="tr"
        key={`${headerGroup.id}_${groupIdx}`}
      >
        {arr}
      </div>
    );
  }), [columns, columnWidths, headerGroups]);

  console.log(columns)

  return (
    <div
      {...getTableProps()}
      className="table sticky"
      style={{
        maxHeight: boundingBox.height,  // Adjust the height as needed
        maxWidth: boundingBox.width,  // Adjust the width as needed
        overflowX: 'scroll',  // Enable vertical scrolling
        overflowY: 'scroll',  // Enable vertical scrolling
      }}
    >
      <div
        {...getTableBodyProps()}
        className="body"
      >
        <div className="header" ref={refHeader}>
          {headerMemo}
        </div>
        {variableListMemo}
      </div>
    </div>
  );
}

function DataTable({
  boundingBox,
  columns: columnsProp,
  rows,
  ...rest
}: DataTableProps) {
  const columns = useMemo(() => buildIndexColumns(1).concat(
    columnsProp?.map(col => ({
      ...col,
      Header: String(col.uuid),
      accessor: () => String(col.uuid),
    })) as {
      Header: string;
      accessor: (row: any, i: number) => string;
      sticky?: string;
    }[]), [columnsProp],
  );

  return (
    <ContainerStyled
      nested
      style={{
        height: boundingBox.height,
        width: boundingBox.width,
      }}
    >
      <Table
        {...rest}
        boundingBox={boundingBox}
        columns={columns}
        rows={rows}
      />
    </ContainerStyled>
  );
}

export default DataTable;
