import { IconType } from '@mana/icons/types';
import { BadgeType } from '@mana/elements/Badge';
import BlockType from '@interfaces/BlockType';
import { PortType } from '../interfaces';

export type AsideType = {
  Icon?: IconType;
  baseColorName?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
};

export type AsidesType = {
  after?: AsideType;
  before?: AsideType;
};

export type ConnectionPortType = {
  port?: PortType;
  render?: (element: React.ReactNode) => React.ReactNode;
};

export type ConnectionType = {
  from?: string;
  fromItem?: BlockType;
  fromPort?: ConnectionPortType;
  to?: string;
  toItem?: BlockType;
  toPort?: ConnectionPortType;
};

export type TitleConfigType = {
  asides?: AsidesType;
  badge?: BadgeType;
  inputConnection?: ConnectionType;
  label?: string;
  outputConnection?: ConnectionType;
};

type BorderType = {
  baseColorName?: string;
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
