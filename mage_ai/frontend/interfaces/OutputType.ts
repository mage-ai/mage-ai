import { OutputType as OutputTypeInit } from './BlockType';

export const DataType = OutputTypeInit;

export interface DataOutputType {
  data: DataType[];
  uuid: string;
}

export default interface OutputType {
  outputs: DataOutputType[];
}
