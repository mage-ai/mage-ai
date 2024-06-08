import { randomSimpleHashGenerator } from '@utils/string';

export function createUUID() {
  return `grid-item-${randomSimpleHashGenerator()}`;
}
