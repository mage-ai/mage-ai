import { ApplicationExpansionUUIDEnum, LOCAL_STORAGE_KEY_APPLICATION_MANAGER_LAYOUT } from './constants';
import { get, set } from '../localStorage';

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

export function getLayout(uuid: ApplicationExpansionUUIDEnum = null): LayoutType | {
  [uuid: string]: LayoutType;
} {
  const mapping = get(LOCAL_STORAGE_KEY_APPLICATION_MANAGER_LAYOUT);
  return uuid ? mapping?.[uuid] : mapping;
}

export function updateLayout(uuid: ApplicationExpansionUUIDEnum, layout: LayoutType): LayoutType {
  const mapping = getLayout() || {};
  mapping[uuid] = layout;
  set(LOCAL_STORAGE_KEY_APPLICATION_MANAGER_LAYOUT, mapping);

  return layout;
}
