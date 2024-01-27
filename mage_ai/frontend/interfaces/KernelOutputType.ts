import { BlockTypeEnum } from './BlockType';

export enum ExecutionStateEnum {
  BUSY = 'busy', // Code is being executed
  IDLE = 'idle', // Nothing is being done
  QUEUED = 'queued', // Block is being attempted to run but another block is still busy
}

export enum ExecutionStatusEnum {
  CANCELLED = 'cancelled',
  EMPTY_RESULTS = 'empty_results',
  FAILED = 'failed',
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
}

export const EXECUTION_STATE_DISPLAY_LABEL_MAPPING = {
  [ExecutionStateEnum.BUSY]: 'Executing',
  [ExecutionStateEnum.IDLE]: 'Ready',
  [ExecutionStateEnum.QUEUED]: 'Queued',
};

export const EXECUTION_STATUS_DISPLAY_LABEL_MAPPING = {
  [ExecutionStatusEnum.CANCELLED]: 'Cancelled',
  [ExecutionStatusEnum.EMPTY_RESULTS]: 'No results',
  [ExecutionStatusEnum.FAILED]: 'Failed',
  [ExecutionStatusEnum.RUNNING]: 'Running',
  [ExecutionStatusEnum.SUCCESS]: 'Success',
};

export enum DataTypeEnum {
  IMAGE_PNG = 'image/png',
  PROGRESS = 'progress',
  STDOUT = 'stdout',
  TABLE = 'table',
  TEXT = 'text',
  TEXT_HTML = 'text/html',
  TEXT_PLAIN = 'text/plain',
}

export const DATA_TYPE_TEXTLIKE = [
  DataTypeEnum.STDOUT,
  DataTypeEnum.TEXT,
  DataTypeEnum.TEXT_PLAIN,
];

export enum MsgType {
  DISPLAY_DATA = 'display_data',
  ERROR = 'error',
  EXECUTE_INPUT = 'execute_input',
  EXECUTE_RESULT = 'execute_result',
  EXECUTE_REQUEST = 'execute_requst',
  SHUTDOWN_REQUEST = 'shutdown_request',
  STATUS = 'status',
  STREAM = 'stream',
  STREAM_PIPELINE = 'stream_pipeline',
  USAGE_REQUEST = 'usage_request',
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
  data_types?: DataTypeEnum[];
  block_type?: BlockTypeEnum;
  error?: {
    code: number;
    errors: string[];
    message: string;
    type: string;
  };
  execution_metadata?: ExecutionMetadataType;
  execution_state?: ExecutionStateEnum;
  execution_status?: ExecutionStatusEnum;
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

export interface GroupOfOutputsType {
  dates: string[];
  groupID: string;
  groupsCount: number;
  index: number;
  outputs: KernelOutputType[];
}

export interface RawEventOutputDataType {
  data: string;
}
