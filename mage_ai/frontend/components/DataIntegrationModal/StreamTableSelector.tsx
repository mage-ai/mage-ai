import { useMemo } from 'react';

import Checkbox from '@oracle/elements/Checkbox';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { StreamMapping } from '@utils/models/block';
import { StreamType } from '@interfaces/IntegrationSourceType';
import {
  getStreamFromStreamMapping,
  getStreamID,
  getStreamIDWithParentStream,
  groupStreamsForTables,
  updateStreamInStreamMapping,
} from '@utils/models/block';

type StreamTableSelectorProps = {
  selectedStreamMapping: StreamMapping;
  setSelectedStreamMapping: (prev: (mapping: StreamMapping) => void) => void;
  streamMapping: StreamMapping;
};

function StreamTableSelector({
  selectedStreamMapping,
  setSelectedStreamMapping,
  streamMapping,
}: StreamTableSelectorProps) {
  const streamsGrouped: {
    groupHeader: string;
    streams: StreamType[];
  } = useMemo(() => groupStreamsForTables(streamMapping), [
    streamMapping,
  ]);

  const {
    rowGroupHeaders,
    rows,
    rowsGroupedByIndex,
    streamsArray,
  }: {
    rowGroupHeaders?: string[] | any[];
    rows: any[][];
    rowsGroupedByIndex?: number[][] | string[][];
    streamsArray: StreamType[];
  } = useMemo(() => {
    const rowGroupHeadersInner = [];
    const rowsInner = [];
    const rowsGroupedByIndexInner = [];
    const streamsArrayInner = [];
    let rowCount = 0;

    streamsGrouped?.forEach(({
      groupHeader,
      streams,
    }) => {
      rowGroupHeadersInner.push(groupHeader);

      const groupIndexes = [];

      streams?.forEach((stream: StreamType) => {
        streamsArrayInner.push(stream);
        groupIndexes.push(rowCount);
        rowCount += 1;

        const uuid = getStreamIDWithParentStream(stream);
        const streamID = getStreamID(stream);
        const isSelected = !!getStreamFromStreamMapping(stream, selectedStreamMapping);

        const row = [
          <Checkbox
            checked={isSelected}
            key={`${uuid}-${streamID}-use`}
          />,
          <Text key={`${uuid}-${streamID}-stream`} muted={!isSelected}>
            {streamID}
          </Text>,
        ];

        rowsInner.push(row);
      });

      rowsGroupedByIndexInner.push(groupIndexes);
    });

    return {
      rowGroupHeaders: rowGroupHeadersInner,
      rows: rowsInner,
      rowsGroupedByIndex: rowsGroupedByIndexInner,
      streamsArray: streamsArrayInner,
    }
  }, [
    selectedStreamMapping,
    streamsGrouped,
  ]);

  return (
    <Table
      columnFlex={[null, 1]}
      columns={[
        {
          uuid: 'Use',
        },
        {
          uuid: 'Stream',
        },
      ]}
      groupsInline
      onClickRow={(rowIndex: number) => {
        const stream = streamsArray?.[rowIndex];
        const isSelected = !!getStreamFromStreamMapping(stream, selectedStreamMapping);

        setSelectedStreamMapping(prev => updateStreamInStreamMapping(
          stream,
          prev,
          {
            remove: isSelected,
          },
        ));
      }}
      rowGroupHeaders={rowGroupHeaders}
      rows={rows}
      rowsGroupedByIndex={rowsGroupedByIndex}
      stickyHeader
    />
  );
}

export  default StreamTableSelector;
