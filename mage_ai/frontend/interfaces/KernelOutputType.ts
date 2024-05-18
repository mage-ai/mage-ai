import { BlockTypeEnum, SampleDataType } from './BlockType';

export enum ExecutionStateEnum {
  BUSY = 'busy', // Code is being executed
  IDLE = 'idle', // Nothing is being done
  QUEUED = 'queued', // Block is being attempted to run but another block is still busy
}

export enum DataTypeEnum {
  GROUP = 'group',
  IMAGE_PNG = 'image/png',
  OBJECT = 'object',
  PROGRESS = 'progress',
  TABLE = 'table',
  TEXT = 'text',
  TEXT_HTML = 'text/html',
  TEXT_PLAIN = 'text/plain',
}

export const DATA_TYPE_TEXTLIKE = [DataTypeEnum.TEXT, DataTypeEnum.TEXT_PLAIN];

export enum MsgType {
  DISPLAY_DATA = 'display_data',
  STATUS = 'status',
  STREAM = 'stream',
  STREAM_PIPELINE = 'stream_pipeline',
}

export default interface KernelOutputType {
  data?: SampleDataType | string | string[];
  block_type?: BlockTypeEnum;
  error?: string;
  execution_state?: ExecutionStateEnum;
  group_id?: string | number;
  metadata?: {
    [key: string]: string;
  };
  multi_output?: boolean;
  msg_id?: string;
  msg_type?: MsgType;
  outputs?: KernelOutputType[];
  pipeline_uuid?: string;
  type: DataTypeEnum;
  uuid?: string;
  sample_data?: SampleDataType;
  text_data?: string;
  variable_uuid?: string;
}
