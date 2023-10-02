import { useDrag, useDrop } from 'react-dnd';

import InteractionDisplay from '../InteractionDisplay';
import Spacing from '@oracle/elements/Spacing';
import { ArrowsAdjustingFrameSquare } from '@oracle/icons';
import { ContainerStyle, LayoutItemStyle } from '../index.style';
import {
  InteractionInputType,
  InteractionLayoutItemType,
  InteractionVariableType,
} from '@interfaces/InteractionType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

type LayoutItemProps = {
  columnIndex: number;
  columnLayoutSettings: InteractionLayoutItemType;
  columnsInRow: number;
  disableDrag?: boolean;
  first: boolean;
  input: InteractionInputType;
  onDrop?: (opts: {
    columnIndex: number;
    rowIndex: number;
  }) => void;
  rowIndex: number;
  variable: InteractionVariableType;
  width: number;
};

function LayoutItem({
  columnIndex,
  columnLayoutSettings,
  columnsInRow,
  disableDrag,
  first,
  input,
  onDrop,
  rowIndex,
  variable,
  width,
}: LayoutItemProps) {
  const inputUUID = variable?.input;
  const variableUUID = columnLayoutSettings?.variable;

  const [collected, drag] = useDrag(() => ({
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    item: {
      columnIndex,
      rowIndex,
    },
    type: 'InteractionLayoutItem',
  }), [
    columnIndex,
    rowIndex,
  ]);

  const [, drop] = useDrop(() => ({
    accept: 'InteractionLayoutItem',
    drop: (opts: {
      columnIndex: number;
      rowIndex: number;
    }) => onDrop?.(opts),
  }), [onDrop]);

  return (
    <LayoutItemStyle ref={drop} style={{ width }}>
      <ContainerStyle
        ref={disableDrag ? null : drag}
        style={{ marginLeft: UNIT, marginRight: UNIT }}
      >
        <Spacing p={PADDING_UNITS}>
          <Spacing mb={1}>
            <ArrowsAdjustingFrameSquare default size={2 * UNIT} />
          </Spacing>

          <InteractionDisplay
            interaction={{
              inputs: {
                [inputUUID]: input,
              },
              layout: [
                [
                  {
                    variable: variableUUID,
                    width: 1,
                  },
                ],
              ],
              variables: {
                [variableUUID]: variable,
              },
            }}
          />
        </Spacing>
      </ContainerStyle>
    </LayoutItemStyle>
  );
}

export default LayoutItem;
