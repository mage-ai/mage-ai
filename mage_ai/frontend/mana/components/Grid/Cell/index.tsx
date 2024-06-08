type CellProps = {
  column?: number;
  columnSpan?: number;
  row?: number;
  uuid?: string;
};

function Cell({
  column = 0,
  columnSpan = 0,
  row = 0,
  uuid,
}: CellProps) {
  const element = document.createElement('div');
  element.className = [
    'grid-cell',
    `grid-row-${row}`,
    `grid-col-start-${column}`,
    `grid-col-end-${columnSpan}`,
  ].join(' ');
  element.id = uuid;

  return element;
}

export default Cell;
