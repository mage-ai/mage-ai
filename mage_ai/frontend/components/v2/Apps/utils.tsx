import { AppConfigType, AppLayoutType } from './interfaces';
import { removeClassNames } from '@utils/elements';

import styles from '@styles/scss/components/Grid/Grid.module.scss';

const regex = /^(row-\d+|column-(start|end)-\d+)$/;

export function upsertRootElement({
  layout,
  uuid,
}: AppConfigType) {
  const {
    column,
    columnSpan,
    row,
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

  const arr = [
    'grid',
    'grid-cell',
    `row-${row + 1}`,
    `column-start-${column + 1}`,
    `column-end-${columnSpan + 1}`,
    removeClassNames(
      element?.className,
      cn => regex.test(cn),
    ),
  ];

  element.className = arr?.map(key => styles[key])?.join(' ');

  return element;
}
