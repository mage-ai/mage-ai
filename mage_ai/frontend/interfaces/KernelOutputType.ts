import { BlockTypeEnum } from './BlockType';

export enum ExecutionStateEnum {
  BUSY = 'busy', // Code is being executed
  IDLE = 'idle', // Nothing is being done
  QUEUED = 'queued', // Block is being attempted to run but another block is still busy
}

export enum DataTypeEnum {
  IMAGE_PNG = 'image/png',
  PROGRESS = 'progress',
  TABLE = 'table',
  TEXT = 'text',
  TEXT_HTML = 'text/html',
  TEXT_PLAIN = 'text/plain',
}

export const DATA_TYPE_TEXTLIKE = [
  DataTypeEnum.TEXT,
  DataTypeEnum.TEXT_PLAIN,
];

export enum MsgType {
  DISPLAY_DATA = 'display_data',
  EXECUTE_INPUT = 'execute_input',
  EXECUTE_RESULT = 'execute_result',
  STATUS = 'status',
  STREAM = 'stream',
  STREAM_PIPELINE = 'stream_pipeline',
}

interface ExecutionMetadataType {
  date?: string;
  execution_count?: number
  initialize_database?: boolean;
  metadata?: {
    [key: string]: string;
  };
  reload_modules?: boolean;
  session?: string;
  username?: string;
  version?: string;
}

export default interface KernelOutputType {
  data?: string | string[];
  data_type?: DataTypeEnum;
  block_type?: BlockTypeEnum;
  error?: string;
  execution_metadata?: ExecutionMetadataType;
  execution_state?: ExecutionStateEnum;
  message?: string;
  metadata?: {
    [key: string]: string;
  };
  multi_output?: boolean;
  msg_id?: string;
  msg_type?: MsgType;
  parent_message?: KernelOutputType;
  pipeline_uuid?: string;
  type: DataTypeEnum;
  uuid?: string;
}
