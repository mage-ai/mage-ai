import { useMemo } from 'react';

import Checkbox from '@oracle/elements/Checkbox';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { StreamMapping } from '@utils/models/block';
import { StreamType } from '@interfaces/IntegrationSourceType';
import {
  getStreamFromStreamMapping,
  getStreamID,
  getStreamIDWithParentStream,
  groupStreamsForTables,
  updateStreamInStreamMapping,
} from '@utils/models/block';
import { pluralize } from '@utils/string';
import { sum } from '@utils/array';

type StreamTableSelectorProps = {
  selectedStreamMapping: StreamMapping;
  setSelectedStreamMapping: (prev: StreamMapping) => StreamMapping;
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
  }[] = useMemo(() => groupStreamsForTables(streamMapping), [
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

  const numberOfStreamsSelected = useMemo(() =>
    Object.values(selectedStreamMapping?.noParents || {})?.length
      + sum(
        Object.values(
          selectedStreamMapping?.parents || {},
        )?.map(mapping => Object.values(mapping || {})?.length)
      )
  , [
    selectedStreamMapping,
  ]);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <div>
          <Headline>
            {pluralize('stream', numberOfStreamsSelected || 0)} chosen
          </Headline>

          <Spacing mt={1}>
            <Text default>
              Clicking the Apply button below will use the values from the selected
              properties below and change the values of those properties in all the selected
              columns for all the selected streams.
            </Text>
          </Spacing>
        </div>

      </Spacing>

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

          // @ts-ignore
          setSelectedStreamMapping((prev: StreamMapping) => updateStreamInStreamMapping(
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
    </>
  );
}

export default StreamTableSelector;
