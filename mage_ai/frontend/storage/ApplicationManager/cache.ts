import {
  ApplicationManagerApplication,
  ApplicationExpansionUUIDEnum,
  DimensionType,
  LOCAL_STORAGE_KEY_APPLICATION_MANAGER,
  LayoutType,
  PositionType,
  StateType,
  StatusEnum,
} from './constants';
import {
  ApplicationConfiguration,
} from '@components/CommandCenter/constants';
import { get, set } from '../localStorage';
import { selectEntriesWithValues } from '@utils/hash';

function buildDefaultLayout({
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

export function closeApplication(uuid: ApplicationExpansionUUIDEnum) {
  updateApplication({
    state: {
      status: StatusEnum.CLOSED,
    },
    uuid,
  });
}

export function getCurrentlyOpenedApplications(): ApplicationManagerApplication[] {
  return getApplications()?.filter(({ state }) => state?.status !== StatusEnum.CLOSED);
}

export function getApplications({
  status,
  uuid,
}: {
  status?: StatusEnum;
  uuid?: ApplicationExpansionUUIDEnum;
} = {}): ApplicationManagerApplication[] {
  const arr = get(LOCAL_STORAGE_KEY_APPLICATION_MANAGER) || [];

  if (status || uuid) {
    return arr?.filter(app => (!status || app?.state?.status === status) && (!uuid || app?.uuid === uuid));
  }

  return arr;
}

function updateLayout(layout: LayoutType, layoutPrev?: LayoutType): LayoutType {
  if (!layout || !layoutPrev) {
    return buildDefaultLayout({
      height: typeof window !== 'undefined' ? window?.innerHeight : null,
      width: typeof window !== 'undefined' ? window?.innerWidth : null,
    });
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

  return {
    dimension,
    position,
  };
}

export function updateApplication(application: {
  applicationConfiguration?: ApplicationConfiguration;
  layout?: LayoutType;
  state?: StateType;
  uuid: ApplicationExpansionUUIDEnum;
}) {
  const {
    state,
    uuid,
  } = application;

  let appUpdated;
  let apps = getApplications();

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

    if (index >= 0) {
      apps[index] = appUpdated;
    } else {
      apps.push(appUpdated);
    }
  }

  set(LOCAL_STORAGE_KEY_APPLICATION_MANAGER, apps);

  return appUpdated;
}
