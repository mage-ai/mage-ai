import { OutputType as DataType } from '@interfaces/BlockType';

export interface DataOutputType {
  data: DataType[];
  uuid: string;
}

export default interface OutputType {
  outputs: DataOutputType[];
}
