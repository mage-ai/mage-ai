import { HORIZONTAL_PADDING, NODE_MIN_HEIGHT } from './index.style';
import { SparkSQLNodeType } from '@interfaces/SparkType';
import {
  WIDTH_OF_HEADER_TEXT_CHARACTER,
  WIDTH_OF_SMALL_CHARACTER,
} from '@components/DependencyGraph/BlockNode/utils';

export function getNodeHeight(node: SparkSQLNodeType): number {
  const metrics = node?.metrics || [];

  let height = NODE_MIN_HEIGHT;

  const regexp = new RegExp('\n', 'g');
  let numberOfLines = 0;
  metrics?.forEach(({
    name,
    value,
  }) => {
    numberOfLines += 1;

    const numberOfLinesInRow = [];

    [
      name,
      value,
    ].forEach((text) => {
      const matches = text.matchAll(regexp);
      if (matches) {
        let count = 0;

        while (typeof matches.next().value !== 'undefined') {
          count += 1;
        }

        numberOfLinesInRow.push(count);
      }
    });

    numberOfLines += Math.max(...numberOfLinesInRow);
  });

  const rows = metrics?.length || 0;
  if (rows >= 1) {
    // Table header height
    height += 37;
    // Table row line height
    height += (numberOfLines || 0) * 18;
    // Table row padding top, padding bottom, border
    height += (rows || 0) * (8 + 8 + 1);
  }

  return height;
}

export function getNodeWidth(node: SparkSQLNodeType): number {
  const nodeName = node?.node_name || '';
  const metrics = node?.metrics || [];
  const maxCharacters = Math.max((nodeName?.length || 0), ...metrics?.map(({
    name,
    value,
  }) => (name?.length || 0) + (value?.length || 0)))

  let width = (HORIZONTAL_PADDING * 2) + maxCharacters * (WIDTH_OF_HEADER_TEXT_CHARACTER + 0.3);

  if (metrics?.length) {
    // Padding on the left, in between columns, and on the right.
    width += 4 * HORIZONTAL_PADDING;
  }

  return width;
}
