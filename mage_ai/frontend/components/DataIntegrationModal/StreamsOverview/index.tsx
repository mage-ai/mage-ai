import { useMemo } from 'react';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table, { ColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { ReplicationMethodEnum, UniqueConflictMethodEnum } from '@interfaces/IntegrationSourceType';
import { StreamMapping } from '@utils/models/block';
import { StreamType } from '@interfaces/IntegrationSourceType';
import { sortByKey } from '@utils/array';
import {
  getStreamID,
  getStreamIDWithParentStream,
  isStreamSelected,
  updateStreamMetadata,
} from '@utils/models/block';

type StreamsOverviewProps = {
  block: BlockType;
  streamMapping: StreamMapping;
  updateStreamsInCatalog: (streams: StreamType[]) => any;
};

const INPUT_SHARED_PROPS = {
  compact: true,
  small: true,
};

function StreamsOverview({
  block,
  streamMapping,
  updateStreamsInCatalog,
}: StreamsOverviewProps) {
  const {
    type: blockType,
  } = block || {};
  const {
    noParents,
    parents,
  } = streamMapping || {};

  const streamsGrouped: {
    groupHeader: string;
    streams: StreamType[];
  } = useMemo(() => [
    {
      groupHeader: '',
      streams: sortByKey(Object.values(noParents), (stream: StreamType) => getStreamID(stream)),
    },
    ...sortByKey(Object.entries(parents), ([parentStreamID,]) => parentStreamID).map(([
      groupHeader,
      mapping,
    ]) => ({
      groupHeader,
      streams: sortByKey(Object.values(mapping), (stream: StreamType) => getStreamID(stream)),
    })),
  ], [
    noParents,
    parents,
  ]);

  const {
    columnFlex,
    columns,
  }: {
    columnFlex: number[];
    columns: ColumnType[];
  } = useMemo(() => {
    const cf = [null, 1, 1, 1, null, null]
    const c = [
      {
        label: ({
          groupIndex,
        }) => {
          const {
            streams,
          } = streamsGrouped?.[groupIndex] || {};
          const allSelected = streams && streams?.every((stream) => isStreamSelected(stream));

          return (
            <ToggleSwitch
              checked={allSelected}
              compact
              disabled={!streams?.length}
              onCheck={(valFunc: (val: boolean) => boolean) => {
                if (streams) {
                  updateStreamsInCatalog(streams?.map((stream) => updateStreamMetadata(stream, {
                    selected: valFunc(allSelected),
                  })));
                }
              }}
            />
          );
        },
        uuid: 'action',
      },
      {
        uuid: 'Stream',
      },
      {
        uuid: 'Table',
      },
      {
        uuid: 'Sync',
      },
      {
        uuid: 'Unique conflict',
      },
      {
        center: true,
        uuid: 'Parallel',
      },
    ];

    if (BlockTypeEnum.DATA_EXPORTER === blockType) {
      cf.push(...[null, null]);
      c.push(...[
        {
          center: true,
          uuid: 'Add columns',
        },
        {
          center: true,
          uuid: 'No strict check',
        },
      ]);
    }

    return {
      columnFlex: cf,
      columns: c,
    };
  }, [
    blockType,
    streamsGrouped,
    updateStreamsInCatalog,
  ]);

  const {
    rowGroupHeaders,
    rows,
    rowsGroupedByIndex,
  }: {
    rowGroupHeaders?: string[];
    rows: any[][];
    rowsGroupedByIndex?: number[][] | string[][];
  } = useMemo(() => {
    const rowGroupHeadersInner = [];
    const rowsInner = [];
    const rowsGroupedByIndexInner = [];
    let rowCount = 0;

    streamsGrouped?.forEach(({
      groupHeader,
      streams,
    }) => {
      rowGroupHeadersInner.push(groupHeader);

      const groupIndexes = [];

      streams?.forEach((stream: StreamType) => {
        groupIndexes.push(rowCount);
        rowCount += 1;

        const uuid = getStreamIDWithParentStream(stream);
        const streamID = getStreamID(stream);
        const {
          auto_add_new_fields: autoAddNewFields,
          destination_table: destinationTable,
          disable_column_type_check: disableColumnTypeCheck,
          replication_method: replicationMethod,
          run_in_parallel: runInParallel,
          unique_conflict_method: uniqueConflictMethod,
        } = stream;
        const isSelected = isStreamSelected(stream);

        const row = [
          <ToggleSwitch
            checked={isSelected}
            compact
            key={`${uuid}-action`}
            onCheck={(valFunc: (val: boolean) => boolean) => {
              updateStreamsInCatalog([
                updateStreamMetadata(stream, {
                  selected: valFunc(isSelected),
                }),
              ]);
            }}
          />,
          <Link
            bold
            monospace
            key={`${uuid}-name`}
            onClick={() => {

            }}
            preventDefault
            sameColorAsText
          >
            {streamID}
          </Link>,
          <TextInput
            compact
            key={`${uuid}-destinationTable`}
            noBackground
            noBorder
            onChange={e => updateStreamsInCatalog([
              {
                ...stream,
                destination_table: e?.target?.value,
              },
            ])}
            paddingHorizontal={0}
            value={destinationTable || ''}
          />,
          <Select
            {...INPUT_SHARED_PROPS}
            key={`${uuid}-replicationMethod`}
            onChange={e => updateStreamsInCatalog([
              {
                ...stream,
                replication_method: e?.target?.value,
              },
            ])}
            placeholder="Replication method"
            value={replicationMethod}
          >
            {Object.values(ReplicationMethodEnum).map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>,
          <Select
            {...INPUT_SHARED_PROPS}
            key={`${uuid}-uniqueConflictMethod`}
            onChange={e => updateStreamsInCatalog([
              {
                ...stream,
                unique_conflict_method: e?.target?.value,
              },
            ])}
            placeholder="Unique conflict method"
            value={uniqueConflictMethod}
          >
            {Object.values(UniqueConflictMethodEnum).map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>,
          <ToggleSwitch
            checked={!!runInParallel}
            compact
            key={`${uuid}-runInParallel`}
            onCheck={(valFunc: (val: boolean) => boolean) => {
              updateStreamsInCatalog([
                {
                  ...stream,
                  run_in_parallel: valFunc(runInParallel),
                },
              ]);
            }}
          />,
        ];

        if (BlockTypeEnum.DATA_EXPORTER === blockType) {
          row.push(...[
            <ToggleSwitch
              checked={!!autoAddNewFields}
              compact
              key={`${uuid}-autoAddNewFields`}
              onCheck={(valFunc: (val: boolean) => boolean) => {
                updateStreamsInCatalog([
                  {
                    ...stream,
                    auto_add_new_fields: valFunc(autoAddNewFields),
                  },
                ]);
              }}
            />,
            <ToggleSwitch
              checked={!!disableColumnTypeCheck}
              compact
              key={`${uuid}-disableColumnTypeCheck`}
              onCheck={(valFunc: (val: boolean) => boolean) => {
                updateStreamsInCatalog([
                  {
                    ...stream,
                    disable_column_type_check: valFunc(disableColumnTypeCheck),
                  },
                ]);
              }}
            />,
          ]);
        }

        rowsInner.push(row);
      });

      rowsGroupedByIndexInner.push(groupIndexes);
    });

    return {
      rowGroupHeaders: rowGroupHeadersInner,
      rows: rowsInner,
      rowsGroupedByIndex: rowsGroupedByIndexInner,
    }
  }, [
    blockType,
    streamsGrouped,
    updateStreamsInCatalog,
  ]);

  return (
    <>
      <Spacing mb={PADDING_UNITS}>
        <Headline>
          Overview of streams
        </Headline>
      </Spacing>

      <Table
        columnFlex={columnFlex}
        columns={columns}
        isSelectedRow={(rowIndex: number) => false}
        onClickRow={(rowIndex: number) => {

        }}
        rowGroupHeaders={rowGroupHeaders}
        rows={rows}
        rowsGroupedByIndex={rowsGroupedByIndex}
        stickyHeader
      />
    </>
  );
}

export default StreamsOverview;
