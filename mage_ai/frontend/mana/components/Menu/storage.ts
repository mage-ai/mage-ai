import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { hyphensToSnake } from '@utils/url';
import { get, remove, set } from '@storage/localStorage';

const BASE_KEY = 'menu-items-cache';

function cacheKey(uuid: string): string {
  return `${BASE_KEY}-${hyphensToSnake(uuid)}`;
}

export function getCache(uuid: string): MenuGroupType[] | null {
  return get(cacheKey(uuid));
}

export function deleteCache(uuid: string) {
  return remove(cacheKey(uuid));
}

export function updateCache(uuid: string, menuItems: MenuGroupType[]) {
  set(cacheKey(uuid), menuItems);
}
