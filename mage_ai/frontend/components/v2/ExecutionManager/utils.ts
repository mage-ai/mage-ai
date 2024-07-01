import EventStreamType, {
  ProcessDetailsType,
  ServerConnectionStatusType,
  EventStreamResponseType,
  EventSourceReadyState,
} from '@interfaces/EventStreamType';

export function closeConnection(eventSource: EventSource): ServerConnectionStatusType {
  if (eventSource) {
    eventSource?.close();
  }

  return ServerConnectionStatusType.CLOSED;
}
