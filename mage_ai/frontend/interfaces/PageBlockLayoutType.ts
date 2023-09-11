import BlockLayoutItemType from './BlockLayoutItemType';

export interface ColumnType {
  block_uuid: string;
  height?: number;
  max_width_percentage?: number;
  width: number;
}

export default interface PageBlockLayoutType {
  blocks: {
    [uuid: string]: BlockLayoutItemType;
  };
  layout: ColumnType[][];
  uuid?: string;
}
