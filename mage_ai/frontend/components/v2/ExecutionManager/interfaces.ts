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

export interface ExecuteCodeHook {
  executeCode: (message: string, payload?: {
    message_request_uuid?: string;
    source?: string;
    stream?: string;
  }) => void;
  messageRequestUUID: string;
}

export interface RegistrationHook {
  subscribe: (consumer: string, handlers: EventSourceHandlers) => void;
  unsubscribe: (consumer: string) => void;
}

export interface ExecutionManagerType {
  useExecuteCode: (channel: string, stream?: string) => ExecuteCodeHook;
  useRegistration: (channel: string, stream?: string) => RegistrationHook;
  teardown: () => void;
}