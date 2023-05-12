import BlockType, {
  BlockColorEnum,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import { UNIT } from '@oracle/styles/units/spacing';

export const MIN_NODE_WIDTH = UNIT * 20;

export const ZOOMABLE_CANVAS_SIZE = 10000;
export const SHARED_ZOOM_BUTTON_PROPS = {
  compact: true,
};

export const SHARED_PORT_PROPS = {
  height: 10,
  width: 10,
};

export const INVERTED_TEXT_COLOR_BLOCK_TYPES = [
  BlockTypeEnum.DATA_EXPORTER,
  BlockTypeEnum.SENSOR,
];

export const INVERTED_TEXT_COLOR_BLOCK_COLORS = [
  BlockColorEnum.GREY,
  BlockColorEnum.PINK,
  BlockColorEnum.TEAL,
  BlockColorEnum.YELLOW,
];

export enum SideEnum {
  NORTH = 'NORTH',
  SOUTH = 'SOUTH',
}

export type EdgeType = {
  from: string;
  fromPort: string;
  id: string;
  to: string;
  toPort: string;
};

export type PortType = {
  height: number;
  id: string;
  side: SideEnum;
  width: number;
};

export type NodeType = {
  data: {
    block: BlockType;
  };
  height: number;
  id: string;
  ports: PortType[];
  width: number;
};
