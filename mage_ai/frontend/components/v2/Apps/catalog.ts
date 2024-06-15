import { mergeDeep } from '@utils/hash';
import { AppSubtypeEnum, AppTypeEnum, AppUUIDEnum, PanelUUIDEnum } from './constants';
import { AppConfigType, PanelType } from './interfaces';

export function EditorIDEApp(appProps?: AppConfigType): AppConfigType {
  return mergeDeep(
    {
      subtype: AppSubtypeEnum.IDE,
      type: AppTypeEnum.EDITOR,
      uuid:
        appProps?.uuid ||
        '/home/src/default_repo/mlops/mlops/memory_upgrade_v2/transformers/artistic_portal.py',
    },
    appProps,
  );
}

export function FileBrowserApp(appProps?: AppConfigType): AppConfigType {
  return mergeDeep(
    {
      ...appProps,
      subtype: AppSubtypeEnum.SYSTEM,
      type: AppTypeEnum.BROWSER,
      uuid: AppUUIDEnum.FILE_BROWSER,
    },
    appProps,
  );
}

export function DefaultPanel(appProps?: AppConfigType): PanelType {
  return mergeDeep(
    {
      apps: [FileBrowserApp, EditorIDEApp],
      layout: {
        column: -1,
      },
      uuid: PanelUUIDEnum.DEFAULT,
    },
    appProps,
  );
}

export const Apps = [FileBrowserApp];

export const Panels = [DefaultPanel];
