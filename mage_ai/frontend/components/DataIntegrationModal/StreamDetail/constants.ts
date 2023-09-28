import { ColumnsMappingType } from '@utils/models/block';
import { StreamType } from '@interfaces/IntegrationSourceType';
import { StreamsOverviewProps } from '../StreamsOverview';

export type StreamDetailProps = {
  highlightedColumnsMapping: ColumnsMappingType;
  setBlockAttributes: (prev: any) => void;
  setHighlightedColumnsMapping: (func: (opts: ColumnsMappingType) => ColumnsMappingType) => any;
  stream: StreamType;
} & StreamsOverviewProps;
