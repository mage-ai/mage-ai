import { StreamType } from '@interfaces/IntegrationSourceType';
import { StreamsOverviewProps } from '../StreamsOverview';

type ColumnsMapping = {
  [column: string]: any;
};

export type StreamDetailProps = {
  highlightedColumnsMapping: ColumnsMapping;
  setBlockAttributes: (prev: any) => void;
  setHighlightedColumnsMapping: (func: (opts: ColumnsMapping) => ColumnsMapping) => any;
  stream: StreamType;
} & StreamsOverviewProps;
