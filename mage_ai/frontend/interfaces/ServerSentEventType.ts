export enum ServerConnectionStatusType {
  CLOSED = 'closed',
  CONNECTING = 'connecting',
  OPEN = 'open',
}

export enum ServerSentEventTypeEnum {
  EVENT = 'event',
}

export interface ServerSentEventPayloadType {
  message: string;
  uuid: string;
}

export interface ServerSentEventResponseType {
  data: string;
}

export interface ServerSentEventErrorType {
  errors?: string[];
  code?: number;
  exception?: string;
  message?: string;
  type?: string;
  uuid: string;
}

export default interface ServerSentEventType {
  data: string;
  event_id: string;
  timestamp: number;
  type: ServerSentEventTypeEnum;
  uuid: string;
}
