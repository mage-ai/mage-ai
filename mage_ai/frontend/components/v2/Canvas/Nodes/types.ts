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
