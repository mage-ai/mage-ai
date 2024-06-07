type CellProps = {
  column?: number;
  row?: number;
  uuid: string;
};

function Cell({
  column,
  row,
  uuid,
}: CellProps) {
  const element = document.createElement('div');
  element.className = `grid-row-${row || 0} grid-col-${column || 0}`;
  element.id = uuid;

  return element;
}

export default Cell;
