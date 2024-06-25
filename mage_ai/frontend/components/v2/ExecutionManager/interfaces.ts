type ExecuteCodeResult = [any, () => void];

export interface ConsumerOperations {
  executeCode: (
    message: string,
    opts?: {
      connect?: boolean;
      future?: boolean;
    },
  ) => ExecuteCodeResult;
  unsubscribe: () => void;
}

export interface EventSourceHandlers {
  onError?: (error: Event) => void;
  onMessage?: (event: any) => void;
  onOpen?: (status: any, event?: Event) => void;
}

export interface ExecuteCodeHook {
  executeCode: (
    message: string,
    payload?: {
      environment?: any;
      message_request_uuid?: string;
      output_path?: string;
      source?: string;
      stream?: string;
    },
    opts?: {
      onError?: (response: any) => void;
      onSuccess?: (data: { code_execution: any }) => void;
    },
  ) => [string, () => void];
  messageRequestUUID: string;
}

export interface RegistrationHook {
  subscribe: (consumer: string, handlers: EventSourceHandlers) => void;
  unsubscribe: (consumer: string) => void;
}

export interface ExecutionManagerType {
  useExecuteCode: any;
  useRegistration: (channel: string, stream?: string) => RegistrationHook;
  teardown: () => void;
}
