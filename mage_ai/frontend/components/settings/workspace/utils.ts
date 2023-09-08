import api from '@api';
import { FeatureUUIDEnum } from '@interfaces/ProjectType';
import { LOCAL_STORAGE_KEY_DISPLAY_LOCAL_TIMEZONE } from '@storage/constants';
import { get, set } from '@storage/localStorage';

export function shouldDisplayLocalTimezone(checkServer?: boolean): null | boolean {
  const displayLocalTimezone = get(LOCAL_STORAGE_KEY_DISPLAY_LOCAL_TIMEZONE, null);

  if (checkServer && displayLocalTimezone === null) {
    const { data: dataProject } = api.projects.list();
    const project = dataProject?.projects?.[0];
    const displayLocalTimezoneFromServer = project?.features?.[FeatureUUIDEnum.LOCAL_TIMEZONE];

    if (typeof displayLocalTimezoneFromServer === 'boolean') {
      set(LOCAL_STORAGE_KEY_DISPLAY_LOCAL_TIMEZONE, displayLocalTimezoneFromServer);
    }

    return displayLocalTimezoneFromServer;
  }

  return displayLocalTimezone;
}

export function storeLocalTimezoneSetting(displayLocalTimezone: boolean) {
  if (typeof displayLocalTimezone !== 'undefined') {
    set(LOCAL_STORAGE_KEY_DISPLAY_LOCAL_TIMEZONE, displayLocalTimezone);
  }

  return displayLocalTimezone;
}
