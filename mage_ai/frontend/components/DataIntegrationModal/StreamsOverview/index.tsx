import { useCallback, useMemo, useRef, useState } from 'react';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table, { ColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { MainNavigationTabEnum, SubTabEnum } from '../constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  REPLICATION_METHODS_BATCH_PIPELINE,
  ReplicationMethodEnum,
  UniqueConflictMethodEnum,
} from '@interfaces/IntegrationSourceType';
import { StreamMapping } from '@utils/models/block';
import { StreamType } from '@interfaces/IntegrationSourceType';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { isEmptyObject } from '@utils/hash';
import { pauseEvent } from '@utils/events';
import { sortByKey } from '@utils/array';
import {
  getParentStreamID,
  getStreamFromStreamMapping,
  getStreamID,
  getStreamIDWithParentStream,
  groupStreamsForTables,
  isStreamSelected,
  updateStreamInStreamMapping,
  updateStreamMetadata,
} from '@utils/models/block';

export type StreamsOverviewProps = {
  block: BlockType;
  blocksMapping: {
    [blockUUID: string]: BlockType;
  };
  onChangeBlock?: (block: BlockType) => void;
  streamMapping: StreamMapping;
  updateStreamsInCatalog: (streams: StreamType[], callback?: (block: BlockType) => void) => any;
};

type StreamsOverviewInternalProps = {
  selectedStreamMapping: StreamMapping;
  setSelectedMainNavigationTab: (tab: MainNavigationTabEnum | string, subtab?: string) => void;
  setSelectedStreamMapping: (prev: (v: StreamMapping) => StreamMapping) => void;
} & StreamsOverviewProps;

const INPUT_SHARED_PROPS = {
  compact: true,
  small: true,
};

function StreamsOverview({
  block,
  blocksMapping,
  onChangeBlock,
  selectedStreamMapping,
  setSelectedMainNavigationTab,
  setSelectedStreamMapping,
  streamMapping,
  updateStreamsInCatalog: updateStreamsInCatalogProp,
}: StreamsOverviewInternalProps) {
  const timeout = useRef(null);

  const [destinationTablesByStreamUUID, setDestinationTablesByStreamUUID] = useState<{
    [uuid: string]: string;
  }>({});

  const updateStreamsInCatalog =
    useCallback((streams: StreamType[]) => updateStreamsInCatalogProp(
      streams,
      b => onChangeBlock?.(b),
    ),
    [
      onChangeBlock,
      updateStreamsInCatalogProp,
    ]);

  const {
    type: blockType,
  } = block || {};
  const {
    noParents,
    parents,
  } = streamMapping || {};

  const noStreamsExist =
    useMemo(() => isEmptyObject(noParents || {}) && isEmptyObject(parents || {}), [
      noParents,
      parents,
    ]);

  const streamsGrouped: {
    groupHeader: string;
    streams: StreamType[];
  }[] = useMemo(() => groupStreamsForTables(streamMapping), [
    streamMapping,
  ]);

  const {
    columnFlex,
    columns,
  }: {
    columnFlex: number[];
    columns: ColumnType[];
  } = useMemo(() => {
    const cf = [null, 1, 3, 2, 2, null];
    const c: ColumnType[] = [
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
        center: BlockTypeEnum.DATA_EXPORTER === blockType,
        rightAligned: BlockTypeEnum.DATA_EXPORTER !== blockType,
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
    streamsInRows,
  }: {
    rowGroupHeaders?: string[] | any[];
    rows: any[][];
    rowsGroupedByIndex?: number[][] | string[][];
    streamsInRows: StreamType[];
  } = useMemo(() => {
    const streamsInRowsInner = [];
    const rowGroupHeadersInner = [];
    const rowsInner = [];
    const rowsGroupedByIndexInner = [];
    let rowCount = 0;

    streamsGrouped?.forEach(({
      groupHeader,
      streams,
    }) => {
      const blockInGroup = groupHeader ? blocksMapping?.[groupHeader] : null;
      if (blockInGroup) {
        rowGroupHeadersInner.push(
          <Spacing p={PADDING_UNITS}>
            <Text
              bold
              color={getColorsForBlockType(blockInGroup?.type, {
                blockColor: blockInGroup?.color,
              }).accent}
              monospace
            >
              {groupHeader}
            </Text>
          </Spacing>
        );
      } else {
        rowGroupHeadersInner.push(groupHeader);
      }

      const groupIndexes = [];

      streams?.forEach((stream: StreamType) => {
        streamsInRowsInner.push(stream);
        groupIndexes.push(rowCount);
        rowCount += 1;

        const uuid = getStreamIDWithParentStream(stream);
        const parentStream = getParentStreamID(stream);
        const streamID = getStreamID(stream);
        const {
          auto_add_new_fields: autoAddNewFields,
          bookmark_properties: bookmarkProperties,
          destination_table: destinationTableInit,
          disable_column_type_check: disableColumnTypeCheck,
          replication_method: replicationMethod,
          run_in_parallel: runInParallel,
          unique_conflict_method: uniqueConflictMethod,
        } = stream;
        const isSelected = isStreamSelected(stream);
        const destinationTable = uuid in destinationTablesByStreamUUID
          ? destinationTablesByStreamUUID?.[uuid]
          : destinationTableInit;

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
              setSelectedMainNavigationTab(streamID, parentStream);
            }}
            preventDefault
            sameColorAsText
          >
            {streamID}
          </Link>,
          <TextInput
            compact
            defaultColor={!destinationTable}
            key={`${uuid}-destinationTable`}
            monospace
            onChange={(e) => {
              const val = e?.target?.value;

              setDestinationTablesByStreamUUID(prev => ({
                ...prev,
                [uuid]: val,
              }));

              clearTimeout(timeout.current);
              timeout.current = setTimeout(() => updateStreamsInCatalog([
                {
                  ...stream,
                  destination_table: val,
                },
              ]), 300);
            }}
            onClick={pauseEvent}
            placeholder={streamID}
            value={destinationTable || ''}
          />,
          <FlexContainer alignItems="center" key={`${uuid}-replicationMethod`}>
            <Flex flex={1}>
              <Select
                {...INPUT_SHARED_PROPS}
                fullWidth
                onChange={e => updateStreamsInCatalog([
                  {
                    ...stream,
                    replication_method: e?.target?.value,
                  },
                ])}
                onClick={pauseEvent}
                placeholder="Replication method"
                value={replicationMethod}
              >
                {REPLICATION_METHODS_BATCH_PIPELINE.map(value => (
                  <option key={value} value={value}>
                    {capitalizeRemoveUnderscoreLower(value)}
                  </option>
                ))}
              </Select>
            </Flex>

            {ReplicationMethodEnum.INCREMENTAL === replicationMethod && (
              <>
                <Spacing mr={1} />

                {!bookmarkProperties?.length && (
                  <Text danger xsmall>
                    No bookmark properties set
                  </Text>
                )}

                {bookmarkProperties?.length >= 1 && bookmarkProperties?.map((
                  col: string,
                  idx: number,
                ) => (
                  <Text inline key={col} monospace muted xsmall>
                    {idx >= 1 && ', '}{col}
                  </Text>
                ))}
              </>
            )}
          </FlexContainer>,
          <Select
            {...INPUT_SHARED_PROPS}
            key={`${uuid}-uniqueConflictMethod`}
            onChange={e => updateStreamsInCatalog([
              {
                ...stream,
                unique_conflict_method: e?.target?.value,
              },
            ])}
            onClick={pauseEvent}
            placeholder="Unique conflict method"
            value={uniqueConflictMethod}
          >
            {Object.values(UniqueConflictMethodEnum).map(value => (
              <option key={value} value={value}>
                {capitalizeRemoveUnderscoreLower(value)}
              </option>
            ))}
          </Select>,
          <FlexContainer
            alignItems="center"
            justifyContent={BlockTypeEnum.DATA_EXPORTER === blockType ? 'center' : 'flex-end'}
            key={`${uuid}-runInParallel`}
          >
            <ToggleSwitch
              checked={!!runInParallel}
              compact
              onCheck={(valFunc: (val: boolean) => boolean) => {
                updateStreamsInCatalog([
                  {
                    ...stream,
                    run_in_parallel: valFunc(runInParallel),
                  },
                ]);
              }}
            />
          </FlexContainer>,
        ];

        if (BlockTypeEnum.DATA_EXPORTER === blockType) {
          row.push(...[
            <FlexContainer
              alignItems="center"
              justifyContent="center"
              key={`${uuid}-autoAddNewFields`}
            >
              <ToggleSwitch
                checked={!!autoAddNewFields}
                compact
                onCheck={(valFunc: (val: boolean) => boolean) => {
                  updateStreamsInCatalog([
                    {
                      ...stream,
                      auto_add_new_fields: valFunc(autoAddNewFields),
                    },
                  ]);
                }}
              />
            </FlexContainer>,
            <FlexContainer
              alignItems="center"
              justifyContent="center"
              key={`${uuid}-disableColumnTypeCheck`}
            >
              <ToggleSwitch
                checked={!!disableColumnTypeCheck}
                compact
                onCheck={(valFunc: (val: boolean) => boolean) => {
                  updateStreamsInCatalog([
                    {
                      ...stream,
                      disable_column_type_check: valFunc(disableColumnTypeCheck),
                    },
                  ]);
                }}
              />
            </FlexContainer>,
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
      streamsInRows: streamsInRowsInner,
    };
  }, [
    blockType,
    blocksMapping,
    destinationTablesByStreamUUID,
    setDestinationTablesByStreamUUID,
    setSelectedMainNavigationTab,
    streamsGrouped,
    timeout,
    updateStreamsInCatalog,
  ]);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <Headline>
          Overview of streams
        </Headline>

        {noStreamsExist && (
          <Spacing mt={1}>
            <Text default>
              Fetch and add at least 1 stream to the catalog in
              order to see an overview of all the configured stream.
            </Text>

            <Spacing mt={1}>
              <Link
                bold
                onClick={() => setSelectedMainNavigationTab(MainNavigationTabEnum.STREAMS)}
                preventDefault
              >
                Go and fetch Streams
              </Link>
            </Spacing>
          </Spacing>
        )}
      </Spacing>

      {!noStreamsExist && (
        <Table
          columnFlex={columnFlex}
          columns={columns}
          isSelectedRow={(index: number) => {
            const stream = streamsInRows?.[index];
            const isSelected = !!getStreamFromStreamMapping(stream, selectedStreamMapping);

            return isSelected;
          }}
          groupsInline
          onClickRow={(index: number) => {
            const stream = streamsInRows?.[index];
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
      )}
    </>
  );
}

export default StreamsOverview;
