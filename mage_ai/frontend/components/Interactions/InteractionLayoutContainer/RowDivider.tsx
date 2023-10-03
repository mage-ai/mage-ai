import { useDrop } from 'react-dnd';

import Spacing from '@oracle/elements/Spacing';
import { DottedLineStyle } from '../index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type RowDividerProps = {
  children?: any;
  onDrop?: (opts: {
    columnIndex: number;
    rowIndex: number;
  }) => void;
  width?: number;
};

function RowDivider({
  children,
  onDrop,
  width,
}: RowDividerProps) {
  const [, drop] = useDrop(() => ({
    accept: 'InteractionLayoutItem',
    drop: (opts: {
      columnIndex: number;
      rowIndex: number;
    }) => onDrop?.(opts),
  }), [onDrop]);

  return (
    <div ref={drop} style={{ width }}>
      <Spacing p={PADDING_UNITS}>
        {children}

        <DottedLineStyle />
      </Spacing>
    </div>
  );
}

export default RowDivider;
