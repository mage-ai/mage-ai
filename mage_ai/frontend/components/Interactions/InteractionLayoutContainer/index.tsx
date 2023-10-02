import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import LayoutItem from './LayoutItem';
import RowDivider from './RowDivider';
import {
  InteractionInputType,
  InteractionLayoutItemType,
  InteractionVariableType,
} from '@interfaces/InteractionType';
import { insertAtIndex, pushAtIndex, removeAtIndex, sum } from '@utils/array';
import { useWindowSize } from '@utils/sizes';

type InteractionLayoutContainerProps = {
  containerRef: any;
  interaction: InteractionType;
  updateLayout: (layoutNew: InteractionLayoutItemType[][]) => InteractionLayoutItemType[][];
};

function InteractionLayoutContainer({
  containerRef: mainContainerRef,
  interaction,
  updateLayout,
}: InteractionLayoutContainerProps) {
  const windowSize = useWindowSize();

  const [containerRect, setContainerRect] = useState(null);

  useEffect(() => {
    if (mainContainerRef?.current) {
      setContainerRect(mainContainerRef?.current?.getBoundingClientRect());
    }
  }, [
    mainContainerRef,
    windowSize,
  ]);

  const {
    inputs,
    layout,
    variables,
  } = useMemo(() => ({
    inputs: interaction?.inputs,
    layout: interaction?.layout,
    variables: interaction?.variables,
  }), [
    interaction,
  ]);

  const moveLayoutItem = useCallback((
    rowIndex: number,
    columnIndex: number,
    rowIndexNew: number,
    columnIndexNew: number,
    opts?: {
      newRow?: boolean;
    },
  ) => {
    let newLayout = [...(layout || [])];
    const row = newLayout[rowIndex] || [];
    const column = row[columnIndex];

    if (opts?.newRow) {
      // Remove from current row
      const rowOld = removeAtIndex(row, columnIndex);
      newLayout[rowIndex] = rowOld;

      // Adding to row at the start
      if (rowIndexNew === -1) {
        newLayout.unshift([column]);
      } else if (rowIndexNew >= newLayout?.length) {
        newLayout.push([column]);
      } else {
        newLayout = insertAtIndex([column], rowIndexNew, newLayout);
      }

      // Remove row
      if (rowOld?.length === 0) {
        newLayout = removeAtIndex(
          newLayout,
          rowIndexNew < rowIndex ? rowIndex + 1 : rowIndex,
        );
      }

      updateLayout(newLayout);

      return;
    } else if (rowIndex === rowIndexNew && columnIndex !== columnIndexNew) {
      // Same row
      const rowUpdated = removeAtIndex(row, columnIndex);
      newLayout[rowIndex] = pushAtIndex(
        column,
        columnIndexNew > columnIndex ? columnIndexNew : columnIndexNew - 1,
        rowUpdated,
      );
    } else {
      // Different row
      const rowOld = removeAtIndex(row, columnIndex);
      newLayout[rowIndex] = rowOld;

      const rowUpdated = pushAtIndex(
        column,
        columnIndexNew,
        newLayout[rowIndexNew],
      );
      newLayout[rowIndexNew] = rowUpdated;

      // Remove row
      if (rowOld?.length === 0) {
        newLayout = removeAtIndex(
          newLayout,
          rowIndex,
        );
      }
    }

    if (rowIndex !== rowIndexNew || columnIndex !== columnIndexNew) {
      // @ts-ignore
      updateLayout(newLayout);
    }
  }, [
    layout,
    updateLayout,
  ]);

  const layoutWithVariablesAndInput = useMemo(() => {
    const rows = [];

    layout?.forEach((columns: InteractionLayoutItemType[], idx1: number) => {
      const row = [];

      const columnWidthTotal = sum(columns?.map(({ width }) => width || 0));
      const columnsInRow = columns?.length || 0;
      const containerWidth = containerRect?.width;

      columns?.forEach((column: InteractionLayoutItemType, idx2: number) => {
        const {
          variable: variableUUID,
          max_width_percentage: maxWidthPercentage,
          width,
        } = column || {
          variable: null,
          width: 0,
        };
        const variable = variables?.[variableUUID];
        const input = inputs?.[variable?.input];

        const maxWidth = typeof maxWidthPercentage !== 'undefined' && maxWidthPercentage !== null
          ? maxWidthPercentage >= 0
            ? maxWidthPercentage / 100
            : maxWidthPercentage
          : null;
        const widthPercentage = width / columnWidthTotal;
        const widthPercentageFinal = maxWidth && widthPercentage > maxWidth
          ? maxWidth
          : widthPercentage;

        row.push(
          <Flex
            flexBasis={`${Math.floor(widthPercentageFinal * 100)}%`}
            key={`row-${idx1}-column-${idx2}-${variableUUID}`}
          >
            <LayoutItem
              columnIndex={idx2}
              columnLayoutSettings={column}
              columnsInRow={columnsInRow}
              first={0 === idx2}
              input={input}
              onDrop={({
                columnIndex,
                rowIndex,
              }) => {
                moveLayoutItem(
                  rowIndex,
                  columnIndex,
                  idx1,
                  idx2,
                );
              }}
              rowIndex={idx1}
              variable={variable}
              width={Math.floor(widthPercentageFinal * containerWidth)}
            />
          </Flex>,
        );
      });

      if (idx1 === 0) {
        rows.push(
          <RowDivider
            key={`layout-divider-${idx1}-top`}
            onDrop={({
              columnIndex,
              rowIndex,
            }) => {
              moveLayoutItem(
                rowIndex,
                columnIndex,
                idx1 - 1,
                0,
                {
                  newRow: true,
                },
              );
            }}
            width={containerWidth}
          />,
        );
      }

      rows.push(
        <FlexContainer key={`row-${idx1}`}>
          {row}
        </FlexContainer>,
      );

      rows.push(
        <RowDivider
           key={`layout-divider-${idx1}-bottom`}
           onDrop={({
              columnIndex,
              rowIndex,
            }) => {
              moveLayoutItem(
                rowIndex,
                columnIndex,
                idx1 + 1,
                0,
                {
                  newRow: true,
                },
              );
            }}
           width={containerWidth}
        />,
      );
    });

    return rows;
  }, [
    containerRect,
    inputs,
    layout,
    moveLayoutItem,
    variables,
  ]);

  return (
    <DndProvider backend={HTML5Backend}>
      {layoutWithVariablesAndInput}
    </DndProvider>
  );
}

export default InteractionLayoutContainer;
