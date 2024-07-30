import EventStreamType, {
  ProcessDetailsType,
  ServerConnectionStatusType,
  EventStreamResponseType,
  EventSourceReadyState,
  ReadyStateToServerConnectionStatus,
} from '@interfaces/EventStreamType';
import { EnvironmentType } from '@interfaces/CodeExecutionType';
import { APIErrorType } from '@context/v2/APIMutation/Context';
import { ResponseType, MutationFetchArgumentsType } from '@api/interfaces';
import { closeConnection } from './utils';
import { getEventStreamsUrl } from '@api/utils/url';
import { useMutate } from '@context/v2/APIMutation';
import { newMessageRequestUUID } from '@utils/events';
import { useRef } from 'react';
import {
  ConsumerOperations as ConsumerOperationsT,
  EventSourceHandlers as EventSourceHandlersT,
  ExecutionManagerType,
} from './interfaces';
import { setNested } from '@utils/hash';

export type ConsumerOperations = ConsumerOperationsT;
export type EventSourceHandlers = EventSourceHandlersT;

const MAX_OPEN_CONNECTIONS = 1000;
type QueueFunction = (opts?: EventSourceHandlers) => void;
type ConsumerMapping = Record<
  string,
  {
    options: EventSourceHandlers;
  }
>;
type StreamMapping = Record<
  string,
  {
    consumers: ConsumerMapping;
    errors: Event[];
    events: EventStreamType[];
    messages: Record<string, ProcessDetailsType>;
    options: EventSourceHandlers;
    status?: ServerConnectionStatusType;
  }
>;
type ChannelMapping = Record<
  string,
  {
    options: EventSourceHandlers;
    streams: StreamMapping;
  }
>;

function debugLog(message: any, ...args: any[]) {
  const arr = [`[CodeExecutionManager] ${message}`];
  if (Array.isArray(args) && args.length > 0) {
    arr.push(...args);
  }
  false && console.log(...arr);
}

export default function useExecutionManager(
  {
    autoReconnect,
    maxConnectionAttempts,
    throttle,
    onError,
    onMessage: onMessageProp,
    onSuccess,
  }: {
    autoReconnect?: boolean;
    maxConnectionAttempts?: number;
    throttle?: number;
    onError?: (event: Event) => void
    onMessage?: (event: EventStreamType) => void
    onSuccess?: (event: Event) => void
  } = {
    autoReconnect: true,
    maxConnectionAttempts: 10,
    throttle: 1000,
  },
): ExecutionManagerType {
  // Setup
  const chancesLeft = useRef<Record<string, number>>({});
  const timeoutsRef = useRef<Record<string, any>>({});

  // Callbacks
  const onerrorRef = useRef<(event: Event) => void>(null);
  const onmessageRef = useRef<(event: EventStreamResponseType) => void>(null);
  const onopenRef = useRef<(event: Event) => void>(null);

  // Connections
  const eventSourcesRef = useRef<Record<string, EventSource>>({});
  const connectionQueueRef = useRef<QueueFunction[]>([]);
  const queueProcessingTimeoutRef = useRef(null);
  const recentConnectionProcessedTimestampRef = useRef<number>(null);

  // Event data
  const channelsRef = useRef<ChannelMapping>({});
  // const executionsRef = useRef<ProcessDetailsType[]>([]);

  // API
  const responseErrorsRef = useRef<APIErrorType[]>([]);

  const mutants = useMutate(
    { resource: 'code_executions' },
    {
      handlers: {
        create: {
          onError: (error: APIErrorType, args?: MutationFetchArgumentsType) => {
            debugLog('mutants.onError', [error, args]);
            responseErrorsRef.current.push(error);
          },
          onSuccess: (result: ProcessDetailsType, variables?: any) => {
            debugLog('mutants.create.onSuccess', [result, variables]);
            // executionsRef.current.push(result as ProcessDetailsType);
          },
        },
      },
    },
  );

  function processQueue() {
    debugLog(
      'processQueue',
      connectionQueueRef.current.length,
      throttle,
      queueProcessingTimeoutRef.current,
    );
    if (connectionQueueRef.current.length === 0) {
      clearTimeout(queueProcessingTimeoutRef.current);
      queueProcessingTimeoutRef.current = null;
      return;
    }

    if (getOpenConnections()?.length >= MAX_OPEN_CONNECTIONS) {
      debugLog(
        `Max open connections reached: ${getOpenConnections()?.length} of ${MAX_OPEN_CONNECTIONS}`,
      );
      debugLog(`Emptying ${connectionQueueRef.current.length} connection requests from the queue.`);
      connectionQueueRef.current = [];
      return;
    }

    const connect = connectionQueueRef.current.shift();
    connect();
    recentConnectionProcessedTimestampRef.current = Number(new Date());
  }

  function registerStream(channel: string, stream: string, options?: EventSourceHandlers) {
    const connect = (opts?: EventSourceHandlers) => {
      const handle = (optsInternal: EventSourceHandlers) => {
        const { onError, onOpen } = { ...opts, ...optsInternal };

        onopenRef.current = (event: Event) => {
          debugLog('useEventStreams.onopen', eventSource, event);

          const status = ServerConnectionStatusType.OPEN;
          // setStatus(channel, stream, status);
          onOpen && onOpen?.(status, event);
        };

        onerrorRef.current = (error: Event) => {
          console.error(
            `EventSource for channel ${channel} and stream ${stream} failed with error`,
            error,
          );

          closeEventSourceConnection(channel);
          onError && onError?.(error);

          if (!autoReconnect) return;

          // setStatus(channel, stream, ServerConnectionStatusType.RECONNECTING);

          chancesLeft.current[channel] ||= maxConnectionAttempts;
          chancesLeft.current[channel] -= 1;
          const chances = chancesLeft.current[channel];
          if (chances <= 0) return;

          clearTimeout(timeoutsRef?.current?.[channel]);
          timeoutsRef.current[channel] = setTimeout(
            () => {
              debugLog(`Reconnecting to server with ${chances} attempt(s) remaining...`);
              connectEventSource(channel, stream);
            },
            1000 * (maxConnectionAttempts - chances + 1),
          );
        };

        chancesLeft.current[channel] = chancesLeft.current[channel] ?? maxConnectionAttempts;
        connectEventSource(channel, stream);
        const eventSource = getEventSource(channel);
        if (!eventSource) {
          return connect();
        }

        return getEventSource(channel);
      };

      // const handleNext = () => {
      //   const elapsed = Number(new Date()) - (recentConnectionProcessedTimestampRef.current ?? 0);
      //   queueProcessingTimeoutRef.current = setTimeout(processQueue, Math.max(throttle - elapsed, 0));
      // };

      handle({
        onError: (error: Event) => {
          // handleNext()
          if (opts?.onError) {
            opts?.onError?.(error);
          }
        },
        onOpen: (status: ServerConnectionStatusType, event: Event) => {
          // handleNext()
          if (opts?.onOpen) {
            opts?.onOpen?.(status, event);
          }
        },
      });

      // connectionQueueRef.current.push(() => handle({
      //   onError: (error: Event) => {
      //     handleNext()
      //     if (opts?.onError) {
      //       opts?.onError?.(error);
      //     }
      //   },
      //   onOpen: (status: ServerConnectionStatusType, event: Event) => {
      //     handleNext()
      //     if (opts?.onOpen) {
      //       opts?.onOpen?.(status, event);
      //     }
      //   },
      // }));

      // if (!queueProcessingTimeoutRef.current) {
      //   queueProcessingTimeoutRef.current = setTimeout(
      //     processQueue,
      //     0,
      //     // connectionQueueRef.current.length === 1 ? 0 : throttle,
      //   );
      // }
    };

    // Max of 6 connections.
    // Use the same connection but different streams to receive events specific for that strem.

    if (channel in eventSourcesRef.current && stream in channelsRef.current[channel].streams) {
      false &&
        debugLog(
          `Connection already exists for channel ${channel} and stream ${stream} is already registered.`,
        );
      return;
    } else if (getOpenConnections().length >= MAX_OPEN_CONNECTIONS) {
      debugLog(
        `Max open connections reached: ${getOpenConnections()?.length} of ${MAX_OPEN_CONNECTIONS}`,
      );
      return;
    }

    connect();
  }

  function addToStream(
    channel: string,
    stream: string,
    args: {
      error?: Event;
      event?: EventStreamType;
      message?: ProcessDetailsType;
      status?: ServerConnectionStatusType;
    },
  ) {
    if (!(channel in channelsRef.current) || !(stream in channelsRef.current[channel].streams)) {
      return;
    }

    const { error, event, message, status } = args ?? {};

    if (error) {
      channelsRef.current[channel].streams[stream].errors.push(error);
    }
    if (event) {
      channelsRef.current[channel].streams[stream].events.push(event);
    }
    if (message) {
      channelsRef.current[channel].streams[stream].messages[message.message_uuid] = message;
    }
    if (status) {
      channelsRef.current[channel].streams[stream].status = status;
    }
  }

  function useRegistration(
    channel: string,
    stream: string,
  ): {
    subscribe: (consumer: string, handlers: EventSourceHandlers) => void;
    unsubscribe: (consumer: string) => void;
  } {
    const subscribe = (consumer: string, options: EventSourceHandlers) => {
      const map = Object.keys(channelsRef?.current?.[channel]?.streams?.[stream]?.consumers ?? {});
      debugLog('useRegistration.subscribe.before', channel, stream, consumer, options, map);

      setNested(channelsRef?.current ?? {}, [channel, 'options'].join('.'), options);
      setNested(
        channelsRef?.current ?? {},
        [channel, 'streams', stream, 'options'].join('.'),
        options,
      );
      setNested(
        channelsRef?.current ?? {},
        [channel, 'streams', stream, 'consumers', consumer, 'options'].join('.'),
        options,
      );

      registerStream(channel, stream, {
        ...options,
        onOpen: (status: ServerConnectionStatusType, event: Event) => {
          if (options?.onOpen) {
            options?.onOpen?.(status, event);
          }
        },
      });

      const map2 = Object.keys(channelsRef?.current?.[channel]?.streams?.[stream]?.consumers ?? {});
      debugLog('useRegistration.subscribe.after', channel, stream, consumer, options, map2);
    };

    const unsubscribe = (consumer: string) => {
      delete channelsRef?.current?.[channel]?.streams?.[stream]?.consumers?.[consumer];
    };

    return {
      subscribe,
      unsubscribe,
    };
  }

  // To send messages and receive them by a subset of consumers, be sure to pass in:
  // source: where it originated from
  // stream: a grouping under channel but all within the same connection
  // message_request_uuid: a unique identifier for the message; this is kept consistent throughout the code execution lifecycle.
  function useExecuteCode(
    channel: string,
    stream?: string,
  ): {
    executeCode: (
      message: string,
      payload?: {
        environment?: EnvironmentType;
        message_request_uuid?: string;
        output_path?: string;
        source?: string;
      },
      opts?: {
        onError?: (response: ResponseType) => void;
        onSuccess?: (data: { code_execution: ProcessDetailsType }) => void;
      },
    ) => string;
  } {
    const executeCode = (
      message: string,
      payload?: {
        environment?: EnvironmentType;
        message_request_uuid?: string;
        output_path?: string;
        source?: string;
      },
      opts?: {
        onError?: (response: ResponseType) => void;
        onSuccess?: (data: { code_execution: ProcessDetailsType }) => void;
      },
    ): string => {
      const messageRequestUUID = newMessageRequestUUID();

      mutants.create.mutate({
        onError: (response: ResponseType) => {
          opts?.onError && opts?.onError?.(response);
        },
        onSuccess: (data: { code_execution: ProcessDetailsType }) => {
          opts?.onSuccess && opts?.onSuccess?.(data);
        },
        payload: {
          ...payload,
          message,
          message_request_uuid: payload?.message_request_uuid ?? messageRequestUUID,
          stream,
          timestamp: Number(new Date()),
          uuid: channel, // This cannot change or no messages will be received
        } as ProcessDetailsType,
      });

      return messageRequestUUID;
    };

    return {
      executeCode,
    };
  }

  function extractChannelAndStream(event: EventStreamResponseType) {
    const eventData = JSON.parse(event.data ?? '{}');
    const channel = eventData?.uuid;
    const source = eventData?.result?.process?.source;
    const stream = eventData?.result?.process?.stream;

    return { channel, source, stream };
  }

  function handleOnMessage(event: EventStreamResponseType) {
    const { channel, stream } = extractChannelAndStream(event);
    const eventData = JSON.parse(event.data);

    // console.log('Target channel:', eventData.uuid, channel);
    // console.log('Target stream :', eventData.result.process.stream, stream);

    onmessageRef?.current && onmessageRef?.current?.(event);

    if (onMessageProp) {
      onMessageProp?.(eventData);
    }

    // setEvents(channel, stream, eventData);

    channelsRef?.current?.[channel]?.streams[stream]?.options?.onMessage?.(eventData);

    const consumers = channelsRef?.current?.[channel]?.streams[stream]?.consumers ?? {};

    debugLog(
        'useEventStreams.onmessage',
        event,
        eventData,
        channelsRef?.current?.[channel],
        Object.keys(consumers ?? {}),
      );

    Object.values(consumers ?? {})?.forEach(({ options }) => {
      options?.onMessage?.(eventData);
    });
  }

  function handleOnOpen(event: Event) {
    const eventSource = event.target as EventSource;
    onopenRef?.current && onopenRef?.current?.(event);
    debugLog('useEventStreams.onopen', eventSource);
  }

  function handleOnError(event: Event) {
    onerrorRef?.current && onerrorRef?.current?.(event);
    debugLog('useEventStreams.onerror', event);
  }

  function connectEventSource(channel: string, stream: string): EventSource | null {
    let eventSource = getEventSource(channel);
    if (eventSource) {
      if (EventSourceReadyState.OPEN === eventSource.readyState) {
        // setStatus(channel, stream, ServerConnectionStatusType.OPEN);
        clearTimeout(timeoutsRef?.current?.[channel]);
        return eventSource;
      } else {
        const streamCount = Object.keys(channelsRef.current[channel]?.streams ?? {}).length;
        const consumerCount = Object.keys(
          channelsRef.current[channel]?.streams?.[stream]?.consumers ?? {},
        ).length;

        debugLog(
          `Closing inactive connection for channel ${channel} with ${streamCount} ` +
            `streams and ${consumerCount} consumers`,
        );
        closeEventSourceConnection(channel);
        eventSource = null;
      }
    }

    eventSource = getEventSource(channel);
    if (eventSource) return eventSource;

    debugLog('Connecting to server...');
    createEventSource(channel);
    eventSource = getEventSource(channel);
    if (!eventSource) return;
  }

  function getEventSource(channel: string): EventSource {
    const eventSource = eventSourcesRef.current[channel];
    updateEventSourceHandlers(eventSource);
    eventSourcesRef.current[channel] = eventSource;
    return eventSource;
  }

  function createEventSource(channel: string): EventSource {
    const eventSource = new EventSource(getEventStreamsUrl(channel));
    updateEventSourceHandlers(eventSource);
    eventSourcesRef.current[channel] = eventSource;
    return eventSource;
  }

  function updateEventSourceHandlers(eventSource: EventSource) {
    if (!(eventSource ?? false)) return;

    eventSource.onerror = (event: Event): any => {
      handleOnError(event);
    };

    eventSource.onmessage = (event: EventStreamResponseType) => {
      handleOnMessage(event);
    };

    eventSource.onopen = (event: Event) => {
      handleOnOpen(event);
    };
  }

  // function setEvents(channel: string, stream: string, eventData: EventStreamType) {
  //   addToStream(channel, stream, { event: eventData });
  // }

  // function setErrors(channel: string, stream: string, error: Event) {
  //   addToStream(channel, stream, { error });
  // }

  // function setStatus(channel: string, stream: string, status: ServerConnectionStatusType) {
  //   addToStream(channel, stream, { status });
  // }

  function closeEventSourceConnection(uuid: string) {
    if (uuid in channelsRef.current) {
      delete channelsRef.current[uuid];
    }

    const eventSource = getEventSource(uuid);
    if (!eventSource) return;
    closeConnection(eventSource);
    delete eventSourcesRef.current[uuid];
  }

  function hasOpenConnections(): boolean {
    return Object.keys(eventSourcesRef?.current).length > 0;
  }

  function getOpenConnections(): EventSource[] {
    return Object.values(eventSourcesRef?.current ?? [])?.filter(
      es => (es ?? false) && es?.readyState === EventSourceReadyState.OPEN,
    );
  }

  function teardown() {
    if (!hasOpenConnections()) return;

    debugLog('Tearing down...');
    Object.keys(eventSourcesRef?.current).forEach(uuid => {
      closeEventSourceConnection(uuid);
      debugLog(`Closed event stream connection for ${uuid}`);
    });
  }

  return {
    teardown,
    useExecuteCode,
    useRegistration,
  };
}
