import { ErrorDetailsType } from './ErrorsType';

export enum EventStreamTypeEnum {
  EXECUTION = 'execution',
  EXECUTION_STATUS = 'execution_status',
  TASK = 'task',
  TASK_STATUS = 'task_status',
}

export enum ExecutionStatusEnum {
  SUCCESS = 0,
  FAILURE = 1,
  ERROR = 2,
}

export enum ServerConnectionStatusType {
  CLOSED = 'closed',
  CONNECTING = 'connecting',
  OPEN = 'open',
  RECONNECTING = 'reconnecting',
}

export interface ServerSentEventResponseType {
  data: string;
}


export interface ProcessDetailsType {
  exitcode?: number;
  is_alive?: boolean;
  message?: string;
  message_uuid: string;
  pid: number;
  timestamp: number;
  uuid: string;
}

export interface ExecutionResultType {
  error?: ErrorDetailsType;
  output?: any;
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
