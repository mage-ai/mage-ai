import { Children, createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LOCAL_STORAGE_KEY_MULTI_COLUMN_WIDTHS_PREFIX, get, set } from '@storage/localStorage';
import FlexContainer from '@oracle/components/FlexContainer';
import { ColumnStyle, DIVIDER_WIDTH, DRAGGABLE_WIDTH, VerticalDividerStyle } from './index.style';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { range, sortByKey, sum } from '@utils/array';
import { useWindowSize } from '@utils/sizes';

type MultiColumnControllerProps = {
  dividerBackgroundColor?: string;
  dividerBackgroundColorHover?: string;
  columnsOfItems?: {
    render: (opts?: { numberOfColumns?: number; columnWidth?: number; width?: number }) => any;
  }[][];
  fullHeight?: boolean;
  heightOffset?: number;
  uuid: string;
  width?: number;
};

function MultiColumnController({
  dividerBackgroundColor,
  dividerBackgroundColorHover,
  columnsOfItems,
  fullHeight,
  heightOffset,
  uuid,
  width: widthProp,
}: MultiColumnControllerProps) {
  const { height: heightTotal } = useWindowSize();
  const heightColumn = useMemo(
    () => heightTotal - (heightOffset || 0),
    [heightOffset, heightTotal],
  );

  const [columnWidthPercentages, setColumnWidthPercentages] = useState(
    get(`${LOCAL_STORAGE_KEY_MULTI_COLUMN_WIDTHS_PREFIX}_${uuid}`, {}),
  );
  const [mousedownActive, setMousedownActive] = useState(null);

  const refItems = useRef({});
  const refColumns = useRef({});
  const refDividers = useRef({});
  const refDraggingColumn = useRef(null);
  const [activeColumnNumber, setActiveColumnNumber] = useState(null);
  const numberOfColumns = useMemo(() => columnsOfItems?.length || 0, [columnsOfItems]);

  const width = useMemo(() => {
    // Don’t add a divider to the left of the first column.
    const numberOfDividers = numberOfColumns - 1;
    const totalDividersWidth = numberOfDividers * DIVIDER_WIDTH;
    return widthProp - totalDividersWidth;
  }, [numberOfColumns, widthProp]);

  const itemsMemo = useMemo(() => {
    const arr = [];

    columnsOfItems?.forEach((setOfItems, colNumber) => {
      let columnWidth = width / numberOfColumns;

      const percentage = columnWidthPercentages?.[colNumber];
      if (typeof percentage !== 'undefined' && percentage !== null && !isNaN(percentage)) {
        columnWidth = percentage * width;
      }

      if (colNumber >= 1 && colNumber <= numberOfColumns - 1) {
        const keyDivider = `vertical-divider-${colNumber}`;
        if (!(keyDivider in refDividers.current)) {
          refDividers.current[keyDivider] = createRef();
        }
        const ref = refDividers.current[keyDivider];

        arr.push(
          <VerticalDividerStyle
            // Add this back once resizing column widths is supported.
            // backgroundColor={dividerBackgroundColor}
            // backgroundColorHover={dividerBackgroundColorHover}
            key={keyDivider}
            ref={ref}
          />,
        );
      }

      const column = [];

      setOfItems?.forEach((item, idx) => {
        const key = 'column-{colNumber}-item-{idx}';
        if (!(key in refItems.current)) {
          refItems.current[key] = createRef();
        }
        const ref = refItems.current[key];

        column.push(
          <div key={key} ref={ref} style={{ width: '100%' }}>
            {item?.render({
              columnWidth: fullHeight ? columnWidth - SCROLLBAR_WIDTH : columnWidth,
              numberOfColumns,
              width,
            })}
          </div>,
        );
      });

      const key2 = `column-${colNumber}`;
      if (!(key2 in refColumns.current)) {
        refColumns.current[key2] = createRef();
      }
      const ref = refColumns.current[key2];

      arr.push(
        <ColumnStyle
          height={fullHeight ? heightColumn : null}
          key={key2}
          ref={ref}
          width={columnWidth}
        >
          {column}
        </ColumnStyle>,
      );
    });

    return arr;
  }, [columnWidthPercentages, columnsOfItems, fullHeight, heightColumn, numberOfColumns, width]);

  return <FlexContainer flexDirection="row">{itemsMemo}</FlexContainer>;
}

export default MultiColumnController;
