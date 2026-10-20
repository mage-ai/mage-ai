import { AppTypeEnum, AppSubtypeEnum } from './constants';

export enum OperationTypeEnum {
  ADD_APP = 'add-app',
  ADD_PANEL = 'add-panel',
  REMOVE_APP = 'remove-app',
  REMOVE_PANEL = 'remove-panel',
}

export type AddAppOperationType = (app: AppConfigType, opts?: AddAppFunctionOptionsType) => void;
export type AddPanelOperationType = (app: PanelType) => void;
export type RemoveAppOperationType = (
  uuid: string,
  appConfigs?: Record<string, AppConfigType>,
) => void;

export type OperationEffectType =
  | AddAppOperationType
  | AddPanelOperationType
  | RemoveAppOperationType;

type OperationType = {
  label?: () => string;
  description?: () => string;
  effect: OperationEffectType;
  type?: OperationTypeEnum;
  uuid?: string;
};

export type OperationsType = Record<string | OperationTypeEnum, OperationType>;

export type AppLoaderProps = {
  app: AppConfigType;
  operations?: OperationsType;
};

export type AppLoaderResultType = {
  main: JSX.Element | any;
  toolbars?: {
    bottom?: JSX.Element;
    left?: JSX.Element;
    right?: JSX.Element;
    top?: JSX.Element;
  };
};

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

export interface ToolbarsType {
  bottom?: OperationsType;
  left?: OperationsType;
  right?: OperationsType;
  top?: OperationsType;
}

export interface AppConfigType {
  layout?: AppLayoutType;
  operations?: OperationsType;
  options?: {
    [key: string]: any;
  };
  subtype?: AppSubtypeEnum;
  toolbars?: ToolbarsType;
  type?: AppTypeEnum;
  uuid?: string;
}

type AppBuilderType = (appProps?: AppConfigType) => AppConfigType;

export interface PanelType extends AppConfigType {
  apps?: AppBuilderType[];
}
