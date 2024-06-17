import { PortSubtypeEnum } from '../types';

export type AsideType = {
  Icon?: string;
  color?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
};

export type AsidesType = {
  after?: AsideType;
  before?: AsideType;
};

export type ConnectionType = {
  toItem?: any;
  fromItem?: any;
  type: PortSubtypeEnum;
};

export type BadgeType = {
  Icon?: string;
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

export type ConfigurationOptionType = {
  asides?: AsidesType;
  connecton?: ConnectionType;
  interaction?: InteractionConfigType;
  label?: string;
  value?: string;
};

export type InteractionConfigType = {
  select?: any;
  textInput?: any;
};
