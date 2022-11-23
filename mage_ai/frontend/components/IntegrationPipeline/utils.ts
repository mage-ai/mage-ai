import { CatalogType, StreamType } from '@interfaces/IntegrationSourceType';

export function getStreamAndStreamsFromCatalog(catalog: CatalogType, streamUUID: string): {
  stream: StreamType;
  streams: StreamType[];
} {
  let stream;
  const streams = [];
  catalog.streams.forEach((s: StreamType) => {
    if (s.tap_stream_id === streamUUID) {
      stream = s;
    } else {
      streams.push(s);
    }
  });

  return {
    stream,
    streams,
  };
}

export function getSelectedStreamIds(
  selectedStreams: { [key: string]: StreamType },
): string[] {
  return Object.values(selectedStreams)
    .filter((val) => val !== null)
    .map(({ tap_stream_id }) => tap_stream_id);
}
