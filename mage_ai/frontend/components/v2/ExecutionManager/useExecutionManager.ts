import EventStreamType, {
  ProcessDetailsType,
  ServerConnectionStatusType,
  EventStreamResponseType,
  EventSourceReadyState,
} from '@interfaces/EventStreamType';
import { APIErrorType } from '@context/APIMutation/Context';
import { DEBUG } from '../utils/debug';
import { ResponseType, MutationFetchArgumentsType } from '@api/interfaces';
import { closeConnection } from './utils';
import { getEventStreamsUrl } from '@api/utils/url';
import { getNewUUID } from '@utils/string';
import { useMutate } from '@context/APIMutation';
import { useRef } from 'react';
import { ConsumerOperations, EventSourceHandlers, ExecutionManagerType } from './interfaces';

const MAX_OPEN_CONNECTIONS = 6;
type QueueFunction = (opts?: EventSourceHandlers) => void;

function debugLog(message: any, args?: any | any[]) {
  const arr = [`[CodeExecutionManager] ${message}`];
  if (Array.isArray(args)) {
    arr.push(...args);
  } else if (args) {
    arr.push(args);
  }
  DEBUG.codeExecution.manager && console.log(...arr);
}

export default function useExecutionManager({
  autoReconnect,
  maxConnectionAttempts,
  throttle,
}: {
  autoReconnect?: boolean;
  maxConnectionAttempts?: number;
  throttle?: number;
} = {
    autoReconnect: true,
    maxConnectionAttempts: 10,
    throttle: 1000,
  },
): ExecutionManagerType {
  const connectionAttemptsRemainingRef = useRef<Record<string, number>>({});
  const eventSourcesRef = useRef<Record<string, EventSource>>({});
  const timeoutsRef = useRef<Record<string, any>>({});

  const consumersRef = useRef<Record<string, Record<string, string>>>({});
  const errorsRef = useRef<Record<string, Event[]>>({});
  const eventsRef = useRef<Record<string, EventStreamType[]>>({});
  const executionsRef = useRef<ProcessDetailsType[]>([]);
  const messagesRef = useRef<Record<string, Record<string, ProcessDetailsType>>>({});
  const responseErrorsRef = useRef<APIErrorType[]>([]);
  const statusesRef = useRef<Record<string, ServerConnectionStatusType>>({});

  const connectionQueueRef = useRef<QueueFunction[]>([]);
  const queueProcessingTimeoutRef = useRef(null);
  const recentConnectionProcessedTimestampRef = useRef<number>(null);

  const mutants = useMutate({ resource: 'code_executions' }, {
    disableAbort: true,
    handlers: {
      create: {
        onError: (error: APIErrorType, args?: MutationFetchArgumentsType) => {
          debugLog('mutants.onError', [error, args]);
          responseErrorsRef.current.push(error);
        },
        onSuccess: (result: ProcessDetailsType, variables?: any) => {
          debugLog('mutants.create.onSuccess', [result, variables]);
          executionsRef.current.push(result as ProcessDetailsType);
        },
      },
    },
  });

  function processQueue() {
    console.log('processQueue', connectionQueueRef.current.length, throttle, queueProcessingTimeoutRef.current);
    if (connectionQueueRef.current.length === 0) {
      clearTimeout(queueProcessingTimeoutRef.current);
      queueProcessingTimeoutRef.current = null;
      return;
    }

    if (getOpenConnections()?.length >= MAX_OPEN_CONNECTIONS) {
      console.log(`Max open connections reached: ${getOpenConnections()?.length} of ${MAX_OPEN_CONNECTIONS}`);
      console.log(`Emptying ${connectionQueueRef.current.length} connection requests from the queue.`);
      connectionQueueRef.current = [];
      return;
    }

    const connect = connectionQueueRef.current.shift();
    connect();
    recentConnectionProcessedTimestampRef.current = Number(new Date());
  }

  function registerConsumer(uuid: string, consumerUUID: string, options?: EventSourceHandlers): ConsumerOperations {
    consumersRef.current[uuid] ||= {};
    consumersRef.current[uuid][consumerUUID] = consumerUUID;

    const connect = (opts?: EventSourceHandlers) => {
      const handle = (optsInternal: EventSourceHandlers) => {
        connectionAttemptsRemainingRef.current[uuid] ||= maxConnectionAttempts;
        connectEventSource(
          uuid,
          connectionAttemptsRemainingRef.current[uuid],
          { ...options, ...opts, ...optsInternal },
        );

        return eventSourcesRef?.current?.[uuid];
      }

      const handleNext = () => {
        const elapsed = Number(new Date()) - (recentConnectionProcessedTimestampRef.current ?? 0);
        queueProcessingTimeoutRef.current = setTimeout(processQueue, Math.max(throttle - elapsed, 0));
      };

      connectionQueueRef.current.push(() => handle({
        onError: (error: Event) => {
          handleNext()
          if (opts?.onError) {
            opts?.onError?.(error);
          }
        },
        onOpen: (status: ServerConnectionStatusType, event: Event) => {
          handleNext()
          if (opts?.onOpen) {
            opts?.onOpen?.(status, event);
          }
        },
      }));

      if (!queueProcessingTimeoutRef.current) {
        queueProcessingTimeoutRef.current = setTimeout(
          processQueue, connectionQueueRef.current.length === 1 ? 0 : throttle);
      }
    }

    const closeConnection = () => closeEventSourceConnection(uuid, consumerUUID);
    const executeCode = (message: string, opts?: {
      connect?: boolean;
      future?: boolean;
    }): [ProcessDetailsType, () => void] => {
      // const eventSource = eventSourcesRef.current[uuid];
      const messageUUID = getNewUUID();
      const payload = {
        message,
        message_request_uuid: messageUUID,
        timestamp: Number(new Date()),
        uuid,
      } as ProcessDetailsType;
      messagesRef.current[uuid] ||= {};
      messagesRef.current[uuid][messageUUID] = payload;

      const executeHandler = () => {
        const execute = () => mutants.create.mutate({
          onError: (response: ResponseType) => {
            debugLog('[RUNTIME] onError', response);
          },
          onSuccess: (response: ResponseType) => {
            debugLog('[RUNTIME] onSuccess', response);
          },
          payload,
        });

        if (opts?.connect) {
          connect({ onOpen: execute });
        } else {
          execute();
        }
      };

      if (opts?.future) {
        return [payload, executeHandler];
      }

      executeHandler();

      return [payload, undefined];
    }

    return {
      closeConnection,
      connect,
      executeCode,
    };
  }

  function setEvents(uuid: string, eventData: EventStreamType) {
    eventsRef.current[uuid] ||= [];
    eventsRef.current[uuid].push(eventData);
  }

  function setErrors(uuid: string, error: Event) {
    errorsRef.current[uuid] ||= [];
    errorsRef.current[uuid].push(error);
  }

  function setStatus(uuid: string, status: ServerConnectionStatusType) {
    statusesRef.current[uuid] = status;
  }

  function closeEventSourceConnection(uuid: string, consumerUUID?: string) {
    if (consumerUUID && consumerUUID in consumersRef?.current?.[uuid]) {
      delete consumersRef.current[uuid][consumerUUID];
    }

    const eventSource = eventSourcesRef?.current[uuid];
    if (!eventSource) return;
    closeConnection(eventSource);
    delete eventSourcesRef.current[uuid];
  }

  function connectEventSource(uuid: string, attemptsRemaining: number, options?: EventSourceHandlers): EventSource {
    if (attemptsRemaining <= 0) {
      console.log('Max reconnection attempts reached. Stopping reconnection.');
      return;
    }

    const {
      onError,
      onMessage,
      onOpen,
    } = options ?? {};
    let connectionAttemptsRemaining = attemptsRemaining;

    if (eventSourcesRef?.current?.[uuid]) {
      const eventSource = eventSourcesRef?.current?.[uuid];
      if (EventSourceReadyState.OPEN === eventSource.readyState) {
        setStatus(uuid, ServerConnectionStatusType.OPEN);
        connectionAttemptsRemaining = connectionAttemptsRemainingRef?.current?.[uuid];
        clearTimeout(timeoutsRef?.current?.[uuid]);
        if (onOpen) {
          onOpen?.(ServerConnectionStatusType.OPEN);
        }
        return eventSource;
      } else {
        closeEventSourceConnection(uuid);
      }
    }

    let eventSource = eventSourcesRef?.current?.[uuid];
    if (eventSource) return eventSource;

    debugLog('Connecting to server...');
    eventSourcesRef.current[uuid] = new EventSource(getEventStreamsUrl(uuid));
    eventSource = eventSourcesRef?.current?.[uuid];
    if (!eventSource) return;

    eventSource.onopen = (event: Event) => {
      if (DEBUG.codeExecution.manager) {
        debugLog('useEventStreams.onopen', [eventSource, event]);
      }

      const status = ServerConnectionStatusType.OPEN;
      setStatus(uuid, status);
      onOpen && onOpen?.(status, event);
    };

    eventSource.onmessage = (event: EventStreamResponseType) => {
      const eventData = JSON.parse(event.data);

      DEBUG.codeExecution.manager && debugLog(
        'useEventStreams.onmessage', [event, eventData],
      );

      setEvents(uuid, eventData);
      if (eventData.uuid === uuid) {
        onMessage && onMessage?.(eventData);
      }
    };

    eventSource.onerror = (error: Event) => {
      console.error('EventSource failed with error: ', error);

      setErrors(uuid, error);
      closeEventSourceConnection(uuid);
      onError && onError?.(error);

      if (!autoReconnect) return;

      setStatus(uuid, ServerConnectionStatusType.RECONNECTING);

      clearTimeout(timeoutsRef?.current?.[uuid]);
      timeoutsRef.current[uuid] = setTimeout(
        () => {
          debugLog(
            `Reconnecting to server with ${connectionAttemptsRemaining} attempt(s) remaining...`,
          );
          connectEventSource(uuid, connectionAttemptsRemaining - 1, options);
        },
        1000 *
        (Math.max(
          0,
          connectionAttemptsRemainingRef?.current?.[uuid] - connectionAttemptsRemaining,
        ) +
          1),
      );
    };
  }

  function hasOpenConnections(): boolean {
    return Object.keys(eventSourcesRef?.current).length > 0;
  }

  function getOpenConnections(): EventSource[] {
    return Object.values(
      eventSourcesRef?.current ?? [])?.filter(es => es.readyState === EventSourceReadyState.OPEN);
  }

  function teardown() {
    if (!hasOpenConnections()) return;

    DEBUG.codeExecution.manager && debugLog('Tearing down...');
    Object.keys(eventSourcesRef?.current).forEach((uuid) => {
      closeEventSourceConnection(uuid);
      DEBUG.codeExecution.manager && debugLog(`Closed event stream connection for ${uuid}`);
    });
  }

  return {
    registerConsumer,
    teardown,
  };
}
