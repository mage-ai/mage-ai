import { AppSubtypeEnum, AppTypeEnum, AppUUIDEnum, PanelUUIDEnum } from './constants';
import { AppConfigType, PanelType } from './interfaces';

export const FileBrowserApp: AppConfigType = {
  subtype: AppSubtypeEnum.SYSTEM,
  type: AppTypeEnum.BROWSER,
  uuid: AppUUIDEnum.FILE_BROWSER,
};

export const DefaultPanel: PanelType = {
  apps: [FileBrowserApp],
  uuid: PanelUUIDEnum.DEFAULT,
};

export const Apps = [FileBrowserApp];

export const Panels = [DefaultPanel];
