import EventStreamType, {
  ProcessDetailsType,
  ResultType,
  ExecutionStatusEnum,
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

export function executionDone(event: EventStreamType): boolean {
  const status = event.result.status;
  const type = event.result.type;
  return (event?.error ?? event?.result?.error ?? event?.result?.process.exitcode) !== null
    || [ExecutionStatusEnum.ERROR, ExecutionStatusEnum.FAILURE].includes(status)
    || (ExecutionStatusEnum.READY === status && type === ResultType.STATUS);
}
