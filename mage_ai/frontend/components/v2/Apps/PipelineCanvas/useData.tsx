import useEventStreams, { EventStreamsType } from '@utils/server/events/useEventStreams';

export default function useData({ uuid }): EventStreamsType {
  const { errors, events, loading, sendMessage, status } = useEventStreams(uuid);

  return { errors, events, loading, sendMessage, status };
}
