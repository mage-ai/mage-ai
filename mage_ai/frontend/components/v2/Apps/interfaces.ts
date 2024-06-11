import { AppTypeEnum, AppSubtypeEnum } from './constants';

export type AddAppFunctionOptionsType = {
  container?: HTMLElement;
  grid?: {
    absolute?: AppConfigType;
    relative?: AppConfigType;
  };
};

export interface AppLayoutType {
  column?: number;
  columnSpan?: number;
  row?: number;
}

export interface AppConfigType {
  layout?: AppLayoutType;
  subtype?: AppSubtypeEnum;
  type?: AppTypeEnum;
  uuid?: string;
}
