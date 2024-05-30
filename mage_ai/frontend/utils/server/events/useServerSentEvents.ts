import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import api from '@api';
import EventStreamType, {
  ProcessDetailsType,
  ServerConnectionStatusType,
  ServerSentEventResponseType,
} from '@interfaces/ServerSentEventType';
import { getServerSentEventsUrl } from '@api/utils/url';
import { onSuccess } from '@api/utils/response';
import { isDebug } from '@utils/environment';

export default function useServerSentEvents(uuid: string, {
  autoReconnect,
}: {
  autoReconnect?: boolean;
} = {
  autoReconnect: true,
}): {
  errors: EventStreamType[];
  events: EventStreamType[];
  messages: ProcessDetailsType[];
  status: ServerConnectionStatusType;
  loading?: boolean;
  recentEvent?: EventStreamType;
  sendMessage: (payload: {
    message: string;
  }) => void;
} {
  const eventSourceRef = useRef(null);
  const [errors, setErrors] = useState<EventStreamType[]>([]);
  const [events, setEvents] = useState<EventStreamType[]>([]);
  const [messages, setMessages] = useState<ProcessDetailsType[]>([]);
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
          callback: ((resp: { server_sent_event: ProcessDetailsType }) => {
            if (isDebug()) {
              console.log('useServerSentEvents.createMessage', resp);
            }

            if (resp?.server_sent_event) {
              setMessages(prevData => [...prevData, resp?.server_sent_event]);
            }
          }),
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
        console.log('eventSource', eventSource);
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
          setEvents((prevData) => [...prevData, response]);
        }
      };

      eventSource.onerror = (error: EventStreamType) => {
        console.error('EventSource failed with error: ', error);

        // setErrors((prevErrors) => [...prevErrors, {
        //   ...error,
        //   timestamp,
        // }]);
        // setStatus(ServerConnectionStatusType.CLOSED);
        // close(eventSource);

        // if (autoReconnect) {
        //   setTimeout(() => {
        //     setStatus(ServerConnectionStatusType.CONNECTING);
        //     eventSourceRef.current = new EventSource(getServerSentEventsUrl(uuid));
        //   }, 5000); // Retry in 5 seconds
        // }
      };
    }

    return () => {
      close(eventSource);
    };
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
