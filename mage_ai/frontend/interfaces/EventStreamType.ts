import { DataTypeEnum } from './KernelOutputType';
import { ErrorDetailsType } from './ErrorsType';

export enum KernelOperation {
  INTERRUPT = 'interrupt',
  RESTART = 'restart',
  TERMINATE = 'terminate',
}

// https://developer.mozilla.org/docs/Web/API/EventSource/readyState
export enum EventSourceReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSED = 2,
}

export enum ResultType {
  DATA = 'data',
  OUTPUT = 'output',
  STATUS = 'status',
  STDOUT = 'stdout',
}

export enum EventStreamTypeEnum {
  EXECUTION = 'execution',
  EXECUTION_STATUS = 'execution_status',
  TASK = 'task',
  TASK_STATUS = 'task_status',
}

export enum ExecutionStatusEnum {
  CANCELLED = 'cancelled',
  ERROR = 'error',
  FAILURE = 'failure',
  INIT = 'init',
  INTERRUPTED = 'interrupted',
  READY = 'ready',
  RESTARTED = 'restarted',
  RUNNING = 'running',
  SUCCESS = 'success',
  TERMINATED = 'terminated',
}

export const STATUS_DISPLAY_TEXT = {
  [ExecutionStatusEnum.CANCELLED]: 'cancelling',
  [ExecutionStatusEnum.INIT]: 'initializing',
  [ExecutionStatusEnum.INTERRUPTED]: 'interrupting',
  [ExecutionStatusEnum.RESTARTED]: 'restarting',
  [ExecutionStatusEnum.SUCCESS]: 'succeeded',
  [ExecutionStatusEnum.TERMINATED]: 'terminating',
};

export enum ServerConnectionStatusType {
  CLOSED = 'closed', // 2
  CONNECTING = 'connecting', // 0
  OPEN = 'open', // 1
  RECONNECTING = 'reconnecting',
}

export interface EventStreamResponseType {
  data: string;
}

export interface ProcessDetailsType {
  exitcode: number | null;
  is_alive: boolean;
  message: string;
  message_request_uuid: string;
  message_uuid: string;
  output_dir?: string;
  output_file?: string;
  pid: number;
  source?: string;
  stream?: string;
  timestamp: number | null;
  uuid: string;
}

export interface ExecutionResultType {
  data_type: DataTypeEnum;
  error?: ErrorDetailsType;
  metadata?: {
    namespace: string;
    path: string;
  };
  output: string | null;
  output_text?: string;
  process: ProcessDetailsType;
  result_id: string;
  status: ExecutionStatusEnum;
  timestamp: number;
  type: ResultType;
  uuid: string;
}

export default interface EventStreamType {
  error: ErrorDetailsType | null;
  event_uuid: string;
  timestamp: number;
  uuid: string;
  result: ExecutionResultType;
  type: EventStreamTypeEnum;
}

export const ReadyStateToServerConnectionStatus = {
  [EventSourceReadyState.CLOSED]: ServerConnectionStatusType.CLOSED,
  [EventSourceReadyState.CONNECTING]: ServerConnectionStatusType.CONNECTING,
  [EventSourceReadyState.OPEN]: ServerConnectionStatusType.OPEN,
};
