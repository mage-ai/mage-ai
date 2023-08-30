import { BlockLayoutItemType } from './BlockLayoutItemType';

interface ColumnType {
  block_uuid: string;
  height?: number;
  width: number;
}

export default interface PageBlockLayoutType {
  blocks: {
    [uuid: string]: BlockLayoutItemType;
  };
  layout: ColumnType[][];
  uuid: string;
}
