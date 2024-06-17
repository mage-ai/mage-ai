import { PortSubtypeEnum } from '../types';

export type AsideType = {
  Icon?: string;
  color?: string;
};

export type AsidesType = {
  after?: AsideType;
  before?: AsideType;
};

export type ConnectionsType = {
  type: PortSubtypeEnum;
};

export type BadgeType = {
  color?: string;
  label?: string;
};

export type TitleConfigType = {
  asides?: AsidesType;
  badge?: BadgeType;
  connections?: ConnectionType[];
  label?: string;
};

type BorderType = {
  color?: string;
  end?: number;
  start?: number;
};

export type BorderConfigType = {
  borders?: BorderType[];
};
