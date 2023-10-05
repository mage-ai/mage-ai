import { useDrag, useDrop } from 'react-dnd';

import LayoutItem, { LayoutItemProps } from './LayoutItem';

type LayoutItemWithDragProps = {
  columnIndex: number;
  columnsInRow: number;
  onDrop?: (opts: {
    columnIndex: number;
    rowIndex: number;
  }) => void;
  rowIndex: number;
} & LayoutItemProps;

function LayoutItemWithDrag({
  columnIndex,
  columnsInRow,
  onDrop,
  rowIndex,
  ...props
}) {
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
    <LayoutItem
      {...props}
      drag={drag}
      drop={drop}
    />
  );
}

export default LayoutItemWithDrag;
