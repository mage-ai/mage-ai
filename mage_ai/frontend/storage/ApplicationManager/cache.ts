import {
  ApplicationManagerApplication,
  DimensionType,
  LOCAL_STORAGE_KEY_APPLICATION_MANAGER,
  LayoutType,
  PositionType,
  StateType,
  StatusEnum,
} from './constants';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { CUSTOM_EVENT_NAME_APPLICATION_STATE_CHANGED } from '@utils/events/constants';
import { ApplicationConfiguration } from '@components/CommandCenter/constants';
import { get, set } from '../localStorage';
import { dig, selectEntriesWithValues, setNested } from '@utils/hash';

export const APPLICATION_PADDING = 16;
export const DEFAULT_Z_INDEX = 10;

export function minimumLayout() {
  return {
    dimension: {
      height: 240,
      width: 300,
    },
    position: {
      x: 0,
      y: 0,
      z: DEFAULT_Z_INDEX,
    },
  };
}

export function buildDefaultLayout(
  { height: totalHeightProp, width: totalWidthProp } = {
    height: null,
    width: null,
  },
): LayoutType {
  const totalHeight = totalHeightProp || typeof window !== 'undefined' ? window?.innerHeight : 1200;
  const totalWidth = totalWidthProp || typeof window !== 'undefined' ? window?.innerWidth : 1500;

  const height = Math.max(Math.min(totalHeight, 1200), 784) - APPLICATION_PADDING * 2;
  const width = Math.max(Math.min(totalWidth, 1500), 980) - APPLICATION_PADDING * 2;

  return {
    dimension: {
      height,
      width,
    },
    position: {
      x: (totalWidth - width) / 2,
      y: (totalHeight - height) / 2,
      z: DEFAULT_Z_INDEX,
    },
  };
}

export function inactiveLayouts(apps: number, index: number) {
  const totalHeight = typeof window !== 'undefined' ? window?.innerHeight : 1200;
  const totalWidth = typeof window !== 'undefined' ? window?.innerWidth : 1500;

  const spaces = APPLICATION_PADDING * 2 + (apps - 1) * APPLICATION_PADDING;
  const height = (totalHeight - spaces) / apps;
  const width = Math.max(0.15 * totalWidth, 300);

  return {
    dimension: {
      height,
      width,
    },
    position: {
      x: totalWidth - (width + APPLICATION_PADDING),
      y: APPLICATION_PADDING * (index + 1) + height * index,
      z: DEFAULT_Z_INDEX,
    },
  };
}

export function buildGrid(
  rows: number = 1,
  columns: number = 1,
  rowIndex: number = 0,
  columnIndex: number = 0,
  padding: number = APPLICATION_PADDING,
): LayoutType {
  const totalHeight = typeof window !== 'undefined' ? window?.innerHeight : 1200; // fallback value used if window is not defined
  const totalWidth = typeof window !== 'undefined' ? window?.innerWidth : 1500; // fallback value used if window is not defined

  // Calculate the usable area by subtracting padding
  const usableWidth = totalWidth - padding * (columns + 1);
  const usableHeight = totalHeight - padding * (rows + 1);

  // Calculate width and height of each grid cell
  const cellWidth = usableWidth / columns;
  const cellHeight = usableHeight / rows;

  // Calculate the position of the current grid cell
  const xPosition = columnIndex * (cellWidth + padding) + padding;
  const yPosition = rowIndex * (cellHeight + padding) + padding;

  // Return the LayoutType for the cell at (rowIndex, columnIndex)
  return {
    dimension: {
      height: cellHeight,
      width: cellWidth,
    },
    position: {
      x: xPosition,
      y: yPosition,
      z: DEFAULT_Z_INDEX, // Use the default z-index value
    },
  };
}

export function buildMaximumLayout(
  dimension?: DimensionType,
  {
    height: heightPercentage,
    width: widthPercentage,
    x: xPercentage,
    y: yPercentage,
  }: {
    height?: number;
    width?: number;
    x?: number;
    y?: number;
  } = {
    height: null,
    width: null,
    x: null,
    y: null,
  },
): LayoutType {
  const { height: totalHeightProp, width: totalWidthProp } = dimension || {
    height: null,
    width: null,
  };

  const totalHeight = totalHeightProp || typeof window !== 'undefined' ? window?.innerHeight : null;
  const totalWidth = totalWidthProp || typeof window !== 'undefined' ? window?.innerWidth : null;

  let height = totalHeight - APPLICATION_PADDING * 2;
  let width = totalWidth - APPLICATION_PADDING * 2;
  let x = (totalWidth - width) / 2;
  let y = (totalHeight - height) / 2;

  if (heightPercentage !== null) {
    height = totalHeight * heightPercentage - APPLICATION_PADDING * 2;
  }
  if (widthPercentage !== null) {
    width = totalWidth * widthPercentage - APPLICATION_PADDING * 2;
  }
  if (xPercentage !== null) {
    x = totalWidth * xPercentage + APPLICATION_PADDING * 1 * (x >= 50 ? -1 : 1);
  }
  if (yPercentage !== null) {
    y = totalHeight * yPercentage + APPLICATION_PADDING * 1 * (y >= 50 ? -1 : 1);
  }

  return {
    dimension: {
      height,
      width,
    },
    position: {
      x,
      y,
      z: 10,
    },
  };
}

export function closeApplication(uuid: ApplicationExpansionUUIDEnum) {
  updateApplication({
    state: {
      status: StatusEnum.CLOSED,
    },
    uuid,
  });
}

export function getCurrentlyOpenedApplications(
  opts: {
    activeOnly?: boolean;
  } = {
    activeOnly: false,
  },
): ApplicationManagerApplication[] {
  return getApplications()?.filter(({ state }) => {
    if (opts?.activeOnly) {
      return [StatusEnum.ACTIVE].includes(state?.status);
    }

    return state?.status !== StatusEnum.CLOSED;
  });
}

export function getApplications({
  status,
  statuses,
  uuid,
}: {
  status?: StatusEnum;
  statuses?: StatusEnum[];
  uuid?: ApplicationExpansionUUIDEnum;
} = {}): ApplicationManagerApplication[] {
  const arr = (get(LOCAL_STORAGE_KEY_APPLICATION_MANAGER) || [])?.filter(a => !!a);

  if (status || uuid) {
    return arr?.filter(
      app =>
        ((!status && !statuses) ||
          app?.state?.status === status ||
          (statuses?.length >= 1 && statuses?.includes(app?.state?.status))) &&
        (!uuid || app?.uuid === uuid),
    );
  }

  return arr;
}

function updateLayout(layout: LayoutType, layoutPrev?: LayoutType): LayoutType {
  if (!layout && !layoutPrev) {
    return buildDefaultLayout();
  }

  // @ts-ignore
  const position: PositionType = {
    ...selectEntriesWithValues(layoutPrev?.position || {}),
    ...selectEntriesWithValues(layout?.position || {}),
  };

  // @ts-ignore
  const dimension: DimensionType = {
    ...selectEntriesWithValues(layoutPrev?.dimension || {}),
    ...selectEntriesWithValues(layout?.dimension || {}),
  };

  const { dimension: dimensionMax, position: positionMax } = buildMaximumLayout();

  if (dimension?.height > dimensionMax?.height) {
    dimension.height = dimensionMax.height;
    position.y = positionMax.y;
  }

  if (dimension?.width > dimensionMax?.width) {
    dimension.width = dimensionMax.width;
    position.x = positionMax.x;
  }

  const { dimension: dimensionMin, position: positionMin } = minimumLayout();

  if (dimension?.height < dimensionMin?.height) {
    dimension.height = dimensionMin.height;
    position.y = positionMin.y;
  }

  if (dimension?.width < dimensionMin?.width) {
    dimension.width = dimensionMin.width;
    position.x = positionMin.x;
  }

  return {
    dimension,
    position,
  };
}

function validateLayout(app: ApplicationManagerApplication) {
  const { layout } = app;

  const layoutNew = {
    dimension: {
      height: null,
      width: null,
    },
    position: {
      x: null,
      y: null,
      z: null,
    },
  };
  ['dimension.height', 'dimension.width', 'position.x', 'position.y', 'position.z'].forEach(key => {
    setNested(layoutNew, key, Math.max(dig(layout, key) || 0, dig(minimumLayout(), key)));
  });
  app.layout = layoutNew;

  return app;
}

export function updateApplication(application: {
  applicationConfiguration?: ApplicationConfiguration;
  layout?: LayoutType;
  state?: StateType;
  uuid: ApplicationExpansionUUIDEnum;
}): ApplicationManagerApplication {
  const { state, uuid } = application;

  let appUpdated;
  let apps = getApplications();

  const statusChanged = state?.status !== apps?.find(a => a?.uuid === uuid)?.state?.status;

  if (state?.status === StatusEnum.CLOSED) {
    apps = apps?.filter(({ uuid: uuid2 }) => uuid !== uuid2);
  } else {
    const index = apps?.findIndex(({ uuid: uuid2 }) => uuid === uuid2);
    const app = apps?.[index];

    application.layout = updateLayout(application?.layout, app?.layout);
    appUpdated = {
      ...(app || {}),
      ...application,
    };

    appUpdated = validateLayout(appUpdated);

    if (index >= 0) {
      apps[index] = appUpdated;
    } else {
      apps.push(appUpdated);
    }
  }

  set(
    LOCAL_STORAGE_KEY_APPLICATION_MANAGER,
    apps?.filter(a => !!a),
  );

  if (statusChanged) {
    if (typeof window !== 'undefined') {
      const eventCustom = new CustomEvent(CUSTOM_EVENT_NAME_APPLICATION_STATE_CHANGED, {
        detail: {
          item: appUpdated || application,
        },
      });
      window.dispatchEvent(eventCustom);
    }
  }

  return appUpdated;
}
