type CellProps = {
  layout?: {
    column?: number;
    columnSpan?: number;
    row?: number;
  };
  uuid?: string;
};

function Cell({ layout, uuid }: CellProps) {
  const {
    column = 0,
    columnSpan = 0,
    row = 0,
  } = layout || {
    column: 0,
    columnSpan: 0,
    row: 0,
  };

  const element = document.createElement('div');
  element.className = [
    'grid-cell',
    `grid-row-${row}`,
    `grid-col-start-${column}`,
    `grid-col-end-${columnSpan}`,
  ].join(' ');
  element.id = uuid;
  element.style.overflow = 'hidden';

  return element;
}

export default Cell;
