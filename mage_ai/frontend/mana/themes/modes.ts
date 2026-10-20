export enum ModeEnum {
  DARK = 'dark', // Mode 1
  LIGHT = 'light', // Mode 2
  MODE3 = 'mode3',
}

export interface ModeType {
  [ModeEnum.DARK]: number | string;
  [ModeEnum.LIGHT]: number | string;
  [ModeEnum.MODE3]: number | string;
}

export const DEFAULT_MODE = ModeEnum.DARK;
