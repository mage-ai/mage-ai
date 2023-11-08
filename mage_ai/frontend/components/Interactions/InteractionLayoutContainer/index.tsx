import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import LayoutItem from './LayoutItem';
import LayoutItemWithDrag from './LayoutItemWithDrag';
import RowDivider from './RowDivider';
import Spacing from '@oracle/elements/Spacing';
import InteractionType, {
  InteractionInputType,
  InteractionLayoutItemType,
  InteractionVariableType,
} from '@interfaces/InteractionType';
import { UNIT } from '@oracle/styles/units/spacing';
import { insertAtIndex, pushAtIndex, removeAtIndex, sum } from '@utils/array';
import { useWindowSize } from '@utils/sizes';

type InteractionLayoutContainerProps = {
  containerRef: any;
  containerWidth?: number;
  interaction: InteractionType;
  setVariables?: (prev: any) => void;
  showVariableUUID?: boolean;
  updateLayout?: (layoutNew: InteractionLayoutItemType[][]) => void;
  variables?: {
    [key: string]: any;
  };
  widthOffset?: number;
};

function InteractionLayoutContainer({
  containerRef: mainContainerRef,
  containerWidth: containerWidthProp,
  interaction,
  setVariables,
  showVariableUUID,
  updateLayout,
  variables: variablesProp,
  widthOffset: widthOffsetProp,
}: InteractionLayoutContainerProps) {
  const windowSize = useWindowSize();

  const [containerRect, setContainerRect] = useState(null);

  useEffect(() => {
    if (mainContainerRef?.current) {
      setContainerRect(mainContainerRef?.current?.getBoundingClientRect());
    } else if (containerWidthProp) {
      setContainerRect({ width: containerWidthProp });
    }
  }, [
    containerWidthProp,
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

      updateLayout?.(newLayout);

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
      updateLayout?.(newLayout);
    }
  }, [
    layout,
    updateLayout,
  ]);

  const rowsCount = useMemo(() => layout?.length || 0, [layout]);

  const layoutWithVariablesAndInput = useMemo(() => {
    const rows = [];

    layout?.forEach((columns: InteractionLayoutItemType[], idx1: number) => {
      const columnsCount = columns?.length || 0;
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

        const LayoutEl = updateLayout ? LayoutItemWithDrag : LayoutItem;
        const widthAdjusted = Math.floor(widthPercentageFinal * containerWidth);

        let widthOffset = 0;

        if (typeof widthOffsetProp === 'undefined' || widthOffsetProp === null) {
          if (updateLayout) {
            widthOffset = Math.round(24 / columnsCount);
          } else {
            widthOffset = Math.round(50 / columnsCount);
          }
        } else {
          widthOffset = Math.round(widthOffsetProp / columnsCount);
        }

        const widthItem = widthAdjusted - widthOffset;

        row.push(
          <Flex
            flexBasis={`${Math.floor(widthPercentageFinal * 100)}%`}
            key={`row-${idx1}-column-${idx2}-${variableUUID}`}
          >
            <LayoutEl
              columnIndex={idx2}
              columnLayoutSettings={column}
              columnsInRow={columnsInRow}
              disableDrag={!!updateLayout}
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
              setVariables={setVariables}
              showVariableUUID={showVariableUUID}
              variable={variable}
              variables={variablesProp}
              width={widthItem}
            />
          </Flex>,
        );
      });

      if (idx1 === 0 && updateLayout) {
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
            // width={containerWidth - 120}
          />,
        );
      }

      rows.push(
        <FlexContainer key={`row-${idx1}`}>
          {row}
        </FlexContainer>,
      );

      if (updateLayout) {
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
             // width={containerWidth - 120}
          />,
        );
      } else if (idx1 < rowsCount - 1) {
        rows.push(
          <Spacing key={`layout-divider-${idx1}-bottom`} py={2} />
        );
      }
    });

    return rows;
  }, [
    containerRect,
    inputs,
    layout,
    moveLayoutItem,
    rowsCount,
    setVariables,
    showVariableUUID,
    updateLayout,
    variables,
    variablesProp,
    widthOffsetProp,
  ]);

  if (!updateLayout) {
    return (
      <>
        {layoutWithVariablesAndInput}
      </>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      {layoutWithVariablesAndInput}
    </DndProvider>
  );
}

export default InteractionLayoutContainer;
