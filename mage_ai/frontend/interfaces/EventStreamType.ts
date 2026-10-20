import { ErrorDetailsType } from './ErrorsType';

// https://developer.mozilla.org/docs/Web/API/EventSource/readyState
export enum EventSourceReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSED = 2,
}

export enum ResultType {
  DATA = 'data',
  STDOUT = 'stdout',
}

export enum EventStreamTypeEnum {
  EXECUTION = 'execution',
  EXECUTION_STATUS = 'execution_status',
  TASK = 'task',
  TASK_STATUS = 'task_status',
}

export enum ExecutionStatusEnum {
  ERROR = 'error',
  FAILURE = 'failure',
  RUNNING = 'running',
  SUCCESS = 'success',
}

export enum ServerConnectionStatusType {
  CLOSED = 'closed',
  CONNECTING = 'connecting',
  OPEN = 'open',
  RECONNECTING = 'reconnecting',
}

export interface EventStreamResponseType {
  data: string;
}

export interface ProcessDetailsType {
  exitcode?: number;
  is_alive?: boolean;
  message?: string;
  message_request_uuid: string;
  message_uuid: string;
  pid: number;
  timestamp: number;
  uuid: string;
}

export interface ExecutionResultType {
  error?: ErrorDetailsType;
  output?: any;
  output_text?: string;
  process: ProcessDetailsType;
  status: ExecutionStatusEnum;
}

export default interface EventStreamType {
  error?: ErrorDetailsType;
  event_uuid: string;
  timestamp: number;
  uuid: string;
  result: ExecutionResultType;
  type: EventStreamTypeEnum;
}
