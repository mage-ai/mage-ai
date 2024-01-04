import { ApplicationExpansionUUIDEnum, LOCAL_STORAGE_KEY_APPLICATION_MANAGER_LAYOUT } from './constants';
import { get, set } from '../localStorage';
import { selectEntriesWithValues } from '@utils/hash';

interface PositionType {
  x: number;
  y: number;
  z: number;
}

interface DimensionType {
  height: number;
  width: number;
}

interface LayoutType {
  dimension: DimensionType;
  position: PositionType;
}

export function buildDefaultLayout({
  height: totalHeight,
  width: totalWidth,
}): LayoutType {
  const height = Math.min(totalHeight, 1200);
  const width = Math.min(totalWidth, 1500);

  return {
    dimension: {
      height,
      width,
    },
    position: {
      x: (totalWidth - width) / 2,
      y: (totalHeight - height) / 2,
      z: 1,
    },
  };
}

export function getLayoutCache(uuid: ApplicationExpansionUUIDEnum = null): LayoutType | {
  [uuid: string]: LayoutType;
} {
  const mapping = get(LOCAL_STORAGE_KEY_APPLICATION_MANAGER_LAYOUT);
  return uuid ? mapping?.[uuid] : mapping;
}

export function updateLayoutCache(uuid: ApplicationExpansionUUIDEnum, layout: LayoutType): LayoutType {
  const mapping = getLayoutCache() || {};
  const prev = mapping?.[uuid] || {};

  prev.position = {
    ...selectEntriesWithValues(prev?.position || {}),
    ...selectEntriesWithValues(layout?.position || {}),
  }
  prev.dimension = {
    ...selectEntriesWithValues(prev?.dimension || {}),
    ...selectEntriesWithValues(layout?.dimension || {}),
  }

  mapping[uuid] = prev;

  set(LOCAL_STORAGE_KEY_APPLICATION_MANAGER_LAYOUT, mapping);

  return layout;
}
