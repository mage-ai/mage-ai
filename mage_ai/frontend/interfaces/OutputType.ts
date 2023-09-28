import { OutputType as OutputTypeInit } from './BlockType';

export interface DataType extends OutputTypeInit;

export interface DataOutputType {
  data: DataType[];
  uuid: string;
}

export default interface OutputType {
  outputs: DataOutputType[];
}
