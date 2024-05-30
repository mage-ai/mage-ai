import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import api from '@api';
import ServerSentEventType, { ServerSentEventPayloadType, ServerConnectionStatusType, ServerSentEventResponseType, ServerSentEventErrorType } from 'interfaces/ServerSentEventType';
import { getServerSentEventsUrl } from '@api/utils/url';
import { onSuccess } from '@api/utils/response';
import { isDebug } from '@utils/environment';

export default function useServerSentEvents(uuid: string): {
  errors: ServerSentEventErrorType[];
  events: ServerSentEventType[];
  status: ServerConnectionStatusType;
  loading?: boolean;
  recentEvent?: ServerSentEventType;
  sendMessage: (payload: {
    message: string;
  }) => void;
} {
  const eventSourceRef = useRef(null);
  const [errors, setErrors] = useState<ServerSentEventErrorType[]>([]);
  const [events, setEvents] = useState<ServerSentEventType[]>([]);
  const [status, setStatus] = useState<ServerConnectionStatusType>(ServerConnectionStatusType.CONNECTING);

  function close(eventSource: EventSource | null) {
    eventSource?.close();
    eventSourceRef.current = null;
  }

  const [createMessage, { isLoading }] = useMutation(
    (payload: {
      message: string;
    }) => api.server_sent_events.useCreate()({
      server_sent_event: {
        code: payload?.message,
        timestamp: Number(new Date()),
        uuid,
      },
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (resp: any) => {
            if (isDebug()) {
              console.log('useServerSentEvents.createMessage', resp);
            }
          },
          onErrorCallback: ({
            error,
          }) => {
            setErrors((prevErrors) => [...prevErrors, {
              ...error,
              timestamp: Number(new Date()),
            }]);
          },
        },
      ),
    },
  );

  useEffect(() => {
    eventSourceRef.current = new EventSource(getServerSentEventsUrl(uuid));
    const eventSource = eventSourceRef?.current;

    if (eventSource) {
      if (isDebug()) {
        console.log('eventSource', eventSource, status);
      }

      const timestamp = Number(new Date());

      eventSource.onopen = (event: Event) => {
        if (isDebug()) {
          console.log('useServerSentEvents.onopen', event);
        }
        setStatus(ServerConnectionStatusType.OPEN);
      };

      eventSource.onmessage = (event: ServerSentEventResponseType) => {
        if (isDebug()) {
          console.log('useServerSentEvents.onmessage', event);
        }

        const response = JSON.parse(event.data);
        if (response.uuid === uuid) {
          setEvents((prevData) => [...prevData, {
            data: response?.data,
            event_id: response?.event_id,
            timestamp: response?.timestamp,
            type: response?.type,
            uuid: response?.uuid,
          }]);
        }
      };

      eventSource.onerror = (error: ServerSentEventErrorType) => {
        if (isDebug()) {
          console.error(`EventSource failed for ${error.uuid}`, error);
        }
        setErrors((prevErrors) => [...prevErrors, {
          ...error,
          timestamp,
        }]);
        setStatus(ServerConnectionStatusType.CLOSED);
        close(eventSource);
      };
    }

    return () => {
      close(eventSource);
    };
  }, [uuid]);

  return {
    errors,
    loading: isLoading,
    events,
    recentEvent: events?.[events?.length - 1],
    sendMessage: createMessage,
    status,
  };
}
