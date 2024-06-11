import { AppConfigType, AppLayoutType } from '../interfaces';
import { removeClassNames } from '@utils/elements';

import styles from '@styles/scss/components/Grid/Grid.module.scss';

const regex = /(row-\d+|column-(start|end)-\d+)/;

export function updateClassnames(
  element: HTMLElement,
  classNames: string[],
  compare: (text: string) => boolean,
) {
  const arr = [...classNames, removeClassNames(element?.className, compare)];
  element.className = arr?.map(key => (key ? styles[key] || key : ''))?.join(' ');
}

export function upsertRootElement({ layout, uuid }: AppConfigType) {
  const { column, columnSpan, row } = layout || ({} as AppLayoutType);

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
    typeof row !== 'undefined' ? `row-${row + 1}` : '',
    typeof column !== 'undefined' ? `column-start-${column + 1}` : '',
    typeof columnSpan !== 'undefined' ? `column-end-${columnSpan + 2}` : '',
  ];

  updateClassnames(element, arr, cn => regex.test(cn));

  return element;
}
