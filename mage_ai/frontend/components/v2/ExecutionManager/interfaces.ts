import EventStreamType, {
  ProcessDetailsType,
  ServerConnectionStatusType,
} from '@interfaces/EventStreamType';

type ExecuteCodeResult = [ProcessDetailsType, () => void];

export interface ConsumerOperations {
  executeCode: (message: string, opts?: {
    connect?: boolean;
    future?: boolean;
  }) => ExecuteCodeResult;
  unsubscribe: () => void;
}

export interface EventSourceHandlers {
  onError?: (error: Event) => void;
  onMessage?: (event: EventStreamType) => void;
  onOpen?: (status: ServerConnectionStatusType, event?: Event) => void;
}

export interface ExecutionManagerType {
  registerConsumer: (
    channel: string,
    stream: string,
    consumer: string,
    options?: EventSourceHandlers,
  ) => ConsumerOperations;
  teardown: () => void;
}
