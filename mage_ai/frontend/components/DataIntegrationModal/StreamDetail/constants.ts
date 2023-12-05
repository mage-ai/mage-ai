import { ColumnsMappingType, StreamMapping } from '@utils/models/block';
import { StreamType } from '@interfaces/IntegrationSourceType';
import { StreamsOverviewProps } from '../StreamsOverview';
import { SubTabEnum } from '../constants';

export type StreamDetailProps = {
  highlightedColumnsMapping: ColumnsMappingType;
  setBlockAttributes: (prev: any) => void;
  setHighlightedColumnsMapping: (func: (opts: ColumnsMappingType) => ColumnsMappingType) => any;
  setSelectedSubTab?: (subTab: SubTabEnum | string) => void;
  setStreamsMappingConflicts?: (prev: StreamMapping) => StreamMapping;
  stream: StreamType;
  streamsMappingConflicts?: StreamMapping;
} & StreamsOverviewProps;
