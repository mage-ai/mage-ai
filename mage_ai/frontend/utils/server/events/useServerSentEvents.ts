import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import api from '@api';
import EventStreamType, {
  ProcessDetailsType,
  ServerConnectionStatusType,
  ServerSentEventResponseType,
  EventSourceReadyState,
} from '@interfaces/ServerSentEventType';
import { getServerSentEventsUrl } from '@api/utils/url';
import { onSuccess } from '@api/utils/response';
import { isDebug } from '@utils/environment';
import { getNewUUID } from '@utils/string';

export default function useServerSentEvents(uuid: string, {
  autoReconnect,
  maxConnectionAttempts,
}: {
  autoReconnect?: boolean;
  maxConnectionAttempts?: number;
} = {
  autoReconnect: true,
  maxConnectionAttempts: 10,
}): {
  errors: Event[];
  events: EventStreamType[];
  messages: ProcessDetailsType[];
  status: ServerConnectionStatusType;
  loading?: boolean;
  recentEvent?: EventStreamType;
  sendMessage: (payload: {
    message: string;
  }) => void;
} {
  const connectionAttemptsRemainingRef = useRef(maxConnectionAttempts);
  const eventSourceRef = useRef(null);
  const timeoutRef = useRef(null);

  const [errors, setErrors] = useState<Event[]>([]);
  const [events, setEvents] = useState<EventStreamType[]>([]);
  const [messages, setMessages] = useState<ProcessDetailsType[]>([]);
  const [status, setStatus] = useState<ServerConnectionStatusType>(ServerConnectionStatusType.CONNECTING);

  const [createMessage, { isLoading }] = useMutation(
    (payload: {
      message: string;
    }) => {
      setEvents(prevData => [...prevData, null]);

      return api.server_sent_events.useCreate()({
        server_sent_event: {
          message: payload?.message,
          message_request_uuid: getNewUUID(),
          timestamp: Number(new Date()),
          uuid,
        },
      });
    },
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ((resp: { server_sent_event: ProcessDetailsType }) => {
            if (isDebug()) {
              console.log('useServerSentEvents.createMessage', resp);
            }

            if (resp?.server_sent_event) {
              setMessages(prevData => [...prevData, resp?.server_sent_event]);
            }
          }),
          onErrorCallback: (error: any) => {
            setErrors(prevData => [...prevData, error]);
          },
        },
      ),
    },
  );

  function close(eventSourceArg: EventSource = null) {
    const eventSource = eventSourceArg || eventSourceRef?.current;
    if (eventSource) {
      eventSource?.close();
    }

    if (eventSourceRef?.current) {
      eventSourceRef.current = null;
    }

    setStatus(ServerConnectionStatusType.CLOSED);
  }

  function connectEventSource(uuid: string, attemptsRemaining: number) {
    if (attemptsRemaining <= 0) {
      console.log('Max reconnection attempts reached. Stopping reconnection.');
      return;
    }

    let connectionAttemptsRemaining = attemptsRemaining;

    if (eventSourceRef?.current) {
      if (EventSourceReadyState.OPEN === eventSourceRef?.current.readyState) {
        setStatus(ServerConnectionStatusType.OPEN);
        connectionAttemptsRemaining = connectionAttemptsRemainingRef?.current;
        clearTimeout(timeoutRef?.current);
      } else {
        close();
      }
    }

    let eventSource = eventSourceRef?.current;
    if (!eventSource) {
      eventSourceRef.current = new EventSource(getServerSentEventsUrl(uuid));
      eventSource = eventSourceRef?.current;

      if (eventSource) {
        eventSource.onopen = (event: Event) => {
          if (isDebug()) {
            console.log('useServerSentEvents.onopen', eventSource, event);
          }
          setStatus(ServerConnectionStatusType.OPEN);
        };

        eventSource.onmessage = (event: ServerSentEventResponseType) => {
          if (isDebug()) {
            console.log('useServerSentEvents.onmessage', event);
          }

          const eventData = JSON.parse(event.data);
          if (eventData.uuid === uuid) {
            setEvents(prevData => [...prevData, eventData]);
          }
        };

        eventSource.onerror = (error: Event) => {
          console.error('EventSource failed with error: ', error);

          setErrors(prevData => [...prevData, error]);
          close();

          if (autoReconnect) {
            setStatus(ServerConnectionStatusType.RECONNECTING);

            clearTimeout(timeoutRef?.current);
            timeoutRef.current = setTimeout(() => {
              console.log(`Reconnecting to server witth ${connectionAttemptsRemaining} attempt(s) remaining...`);
              connectEventSource(uuid, connectionAttemptsRemaining - 1);
            }, 1000 * (Math.max(0, connectionAttemptsRemainingRef?.current - connectionAttemptsRemaining) + 1));
          }
        };
      }
    }
  }

  useEffect(() => {
   connectEventSource(
     uuid,
     1 + (autoReconnect ? (connectionAttemptsRemainingRef?.current || 0) : 0),
   );

   const eventSource = eventSourceRef?.current;
   return () => {
     close(eventSource);
   };
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReconnect, uuid]);

  return {
    errors,
    events,
    loading: isLoading,
    messages,
    recentEvent: events?.[events?.length - 1],
    sendMessage: createMessage,
    status,
  };
}
