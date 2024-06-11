import { AppConfigType, AppLayoutType } from './interfaces';
import { removeClassNames } from '@utils/elements';

const regex = /grid-(row-\d+|col-(start|end)-\d+)/;

export function upsertRootElement({
  layout,
  uuid,
}: AppConfigType) {
  const {
    column = 0,
    columnSpan = 0,
    row = 0,
  } = layout || {
    column: 0,
    columnSpan: 0,
    row: 0,
  } as AppLayoutType;

  let element = document.getElementById(uuid);

  if (!element) {
    element = document.createElement('div');
  }

  element.id = uuid;
  element.style.display = 'grid';
  element.style.gridTemplateRows = 'inherit';
  element.style.overflow = 'hidden';

  element.className = [
    'grid-cell',
    `grid-row-${row}`,
    `grid-col-start-${column}`,
    `grid-col-end-${columnSpan}`,
    removeClassNames(
      element?.className,
      cn => regex.test(cn),
    ),
  ].join(' ');

  return element;
}
