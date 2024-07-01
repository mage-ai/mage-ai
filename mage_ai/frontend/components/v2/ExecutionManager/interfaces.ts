import EventStreamType, {
  ProcessDetailsType,
  ServerConnectionStatusType,
} from '@interfaces/EventStreamType';

export interface ConsumerOperations {
  closeConnection: () => void;
  connect: () => void;
  executeCode: (message: string) => ProcessDetailsType;
}

export interface EventSourceHandlers {
  onError?: (error: Event) => void;
  onMessage?: (event: EventStreamType) => void;
  onOpen?: (event: Event, status: ServerConnectionStatusType) => void;
}

export interface ExecutionManagerType {
  registerConsumer: (uuid: string, consumerUUID: string, options?: EventSourceHandlers) => ConsumerOperations;
  teardown: () => void;
}
