import ElementType from '@interfaces/ElementType';
import {
  ApplicationConfiguration,
} from '@components/CommandCenter/constants';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';

export const LOCAL_STORAGE_KEY_APPLICATION_MANAGER = 'application_manager';

export enum StatusEnum {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  INACTIVE = 'INACTIVE',
  MINIMIZED = 'MINIMIZED',
  OPEN = 'OPEN',
}

export interface PositionType {
  x?: number;
  y?: number;
  z?: number;
}

export interface DimensionType {
  height: number;
  width: number;
}

export interface StateType {
  status: StatusEnum;
}

export interface LayoutType {
  dimension?: DimensionType;
  position?: PositionType;
}

export interface ApplicationManagerApplication {
  applicationConfiguration: ApplicationConfiguration;
  element?: ElementType;
  layout?: LayoutType;
  state?: StateType;
  uuid: ApplicationExpansionUUIDEnum;
}
