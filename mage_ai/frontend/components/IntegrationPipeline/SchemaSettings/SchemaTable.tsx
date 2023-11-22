import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Chip from '@oracle/components/Chip';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table, { ColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import Tooltip from '@oracle/components/Tooltip';
import usePrevious from '@utils/usePrevious';
import {
  COLUMN_TYPES,
  COLUMN_TYPE_CUSTOM_DATE_TIME,
  ColumnFormatEnum,
  ColumnFormatMapping,
  ColumnTypeEnum,
  IntegrationDestinationEnum,
  IntegrationSourceEnum,
  MetadataKeyEnum,
  PropertyMetadataType,
  ReplicationMethodEnum,
  SchemaPropertyType,
  StreamType,
  UniqueConflictMethodEnum,
} from '@interfaces/IntegrationSourceType';
import { TableContainerStyle } from '../index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { find, indexBy, remove, sortTuplesArrayByFirstItem } from '@utils/array';
import { isEmptyObject, isEqual } from '@utils/hash';
import { pluralize } from '@utils/string';

const SPACING_BOTTOM_UNITS = 5;
const TOOLTIP_LEFT_SPACING = '4px';

const SHARED_TOOLTIP_PROPS = {
  lightBackground: true,
  muted: true,
  relativePosition: true,
};

export type SchemaTableProps = {
  bookmarkValues?: { [key: string]: any };
  destination: IntegrationDestinationEnum;
  isLoadingLoadSampleData: boolean;
  isLoadingUpdateDestinationBlockState?: boolean;
  loadSampleData: (stream: string) => void;
  source: IntegrationSourceEnum;
  streams?: StreamType[];
  updateAllStreams: (streamDataTransformer: (stream: StreamType) => StreamType) => void;
  updateDestinationBlockState?: (payload: any) => void;
  updateMetadataForColumns: (
    streamUUID: string,
    columnNames: string[],
    data: PropertyMetadataType,
  ) => void;
  updateSchemaProperty: (
    streamUUID: string,
    columnName: string,
    data: SchemaPropertyType,
  ) => void;
  updateStream: (
    streamUUID: string,
    streamDataTransformer: (stream: StreamType) => StreamType,
  ) => void;
};

type SchemaTablePropsInternal = {
  stream: StreamType;
} & SchemaTableProps;

const PARTITION_KEY_DESTINATIONS = [
  IntegrationDestinationEnum.BIGQUERY,
  IntegrationDestinationEnum.DELTA_LAKE_S3,
];

function SchemaTable({
  bookmarkValues: bookmarkValuesInit,
  destination,
  isLoadingLoadSampleData,
  isLoadingUpdateDestinationBlockState,
  loadSampleData,
  source,
  stream,
  streams,
  updateAllStreams,
  updateDestinationBlockState,
  updateMetadataForColumns,
  updateSchemaProperty,
  updateStream,
}: SchemaTablePropsInternal) {
  const timeout = useRef(null);

  const {
    bookmark_properties: bookmarkProperties,
    destination_table: destinationTableInit = '',
    key_properties: keyProperties,
    metadata,
    partition_keys: partitionKeys,
    replication_method: replicationMethod,
    run_in_parallel: runInParallel,
    schema: {
      properties,
    },
    tap_stream_id: streamUUID,
    unique_constraints: uniqueConstraints,
    unique_conflict_method: uniqueConflictMethod,
  } = stream;

  const [destinationTable, setDestinationTable] = useState<string>(destinationTableInit);
  const [isApplyingToAllStreams, setIsApplyingToAllStreams] = useState<boolean>(false);
  const [isApplyingToAllStreamsIdx, setIsApplyingToAllStreamsIdx] = useState<number>(null);
  const [showBookmarkValuesTable, setShowBookmarkPropertyTable] = useState<boolean>(!!destination);
  const [bookmarkValues, setBookmarkValues] = useState({ [streamUUID]: bookmarkValuesInit || {} });

  const streamUUIDPrev = usePrevious(streamUUID);
  useEffect(() => {
    if (streamUUIDPrev !== streamUUID) {
      setDestinationTable(destinationTableInit);
      setIsApplyingToAllStreamsIdx(null);
    }
  }, [
    destinationTableInit,
    replicationMethod,
    streamUUID,
    streamUUIDPrev,
    uniqueConflictMethod,
  ]);

  useEffect(() => {
    const bookmmarkValuesFromState = bookmarkValues?.[streamUUID];
    if (bookmarkProperties?.length > 0
      && (
        isEmptyObject(bookmmarkValuesFromState)
        || !isEqual(bookmarkValuesInit, bookmmarkValuesFromState)
      )
    ) {
      setBookmarkValues(prev => ({
        ...prev,
        [streamUUID]: bookmarkValuesInit,
      }));
    }
  // The bookmarkValues dependency is not included below in the dep array
  // because it would cause an infinite rendering loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bookmarkProperties?.length,
    bookmarkValuesInit,
    streamUUID,
  ]);

  const metadataByColumn = useMemo(() => indexBy(metadata, ({ breadcrumb }) => breadcrumb.join('/')), [
    metadata,
  ]);
  const metadataForStream =
    useMemo(() => find(metadata, ({ breadcrumb }) => breadcrumb.length === 0)?.metadata, [metadata]);
  const validKeyProperties = useMemo(() => metadataForStream[MetadataKeyEnum.KEY_PROPERTIES] || [], [
    metadataForStream,
  ]);
  const validReplicationKeys = useMemo(() => metadataForStream[MetadataKeyEnum.REPLICATION_KEYS] || [], [
    metadataForStream,
  ]);

  const showPartitionKey = PARTITION_KEY_DESTINATIONS.includes(destination);
  const hasMultipleStreams = streams.length > 1;

  const removeBookmarkPropertyFromState = useCallback((column) => {
    const updatedBookmarkValues = { ...bookmarkValues?.[streamUUID] };
    if (updatedBookmarkValues.hasOwnProperty(column)) {
      delete updatedBookmarkValues[column];
    }
    setBookmarkValues(prev => ({
      ...prev,
      [streamUUID]: {
        ...updatedBookmarkValues,
      },
    }));
    updateDestinationBlockState({
      block: {
        bookmark_values: updatedBookmarkValues,
        destination_table: destinationTable,
        tap_stream_id: streamUUID,
      },
    });
  }, [bookmarkValues, destinationTable, streamUUID, updateDestinationBlockState]);

  const tableMemo = useMemo(() => {
    const selectedArr = [];
    const selectableColumns = [];

    const rows = sortTuplesArrayByFirstItem(Object.entries(properties)).map(([
      columnName, {
        anyOf: columnTypesAnyOf = [],
        format: columnFormat,
        type: columnTypesInit = [],
      },
    ], rowIdx: number) => {
      const columnTypesSet = new Set(Array.isArray(columnTypesInit)
        ? columnTypesInit
        : [columnTypesInit],
      );
      const columnTypesSetForAllowingPartitionKey = new Set(columnTypesSet);
      columnTypesAnyOf.forEach(({
        format,
        items,
        type,
      }) => {
        if (Array.isArray(type)) {
          type.forEach(t => {
            columnTypesSet.add(t);
            columnTypesSetForAllowingPartitionKey.add(t);
          });
        } else {
          columnTypesSet.add(type);
          columnTypesSetForAllowingPartitionKey.add(type);
          if (format) {
            columnTypesSetForAllowingPartitionKey.add(format);
          }
        }
      });
      const columnTypes = Array.from(columnTypesSet);
      if (columnFormat) {
        columnTypesSetForAllowingPartitionKey.add(columnFormat);
      }

      const {
        metadata: {
          inclusion,
          selected,
        },
      } = metadataByColumn[`properties/${columnName}`] || {};
      selectedArr.push(selected);
      selectableColumns.push(columnName);

      const columnTypeOptions = COLUMN_TYPES.reduce((acc, colType: ColumnTypeEnum) => {
        if (columnTypes.indexOf(colType) >= 0
          || (COLUMN_TYPE_CUSTOM_DATE_TIME === String(colType) && ColumnFormatEnum.DATE_TIME === columnFormat)
          || (ColumnFormatEnum.UUID === String(colType) && ColumnFormatEnum.UUID === columnFormat)
        ) {
          return acc;
        }

        return acc.concat(
          <option key={colType} value={colType}>
            {colType}
          </option>,
        );
      }, []);
      const indexOfFirstStringType =
        columnTypes.findIndex((colType: ColumnTypeEnum) => colType === ColumnTypeEnum.STRING);

      const row = [
        <Checkbox
          checked={selected}
          key={`${streamUUID}/${columnName}/selected`}
          onClick={() => {
            updateMetadataForColumns(streamUUID, [columnName], {
              selected: !selected,
            });
          }}
        />,
        <Text
          key={`${streamUUID}/${columnName}/name`}
        >
          {columnName}
        </Text>,
        <FlexContainer
          key={`${streamUUID}/${columnName}/type`}
        >
          <Flex flex={1}>
            <FlexContainer
              alignItems="center"
              flexWrap="wrap"
              fullWidth
            >
              {columnTypes.map((columnType: ColumnTypeEnum, idx: number) => (
                <Spacing
                  key={`${streamUUID}/${columnName}/${columnType}/${idx}/chip`}
                  mb={1}
                  mr={1}
                >
                  <Chip
                    border
                    label={(columnFormat
                        && ColumnTypeEnum.STRING === columnType
                        && indexOfFirstStringType === idx)
                      ? ColumnFormatMapping[columnFormat]
                      : columnType
                    }
                    onClick={() => {
                      const data: SchemaPropertyType = {
                        format: columnFormat,
                        type: columnTypes.filter((colType: ColumnTypeEnum) =>
                          colType !== columnType),
                      };

                      if ((ColumnFormatEnum.DATE_TIME === columnFormat || ColumnFormatEnum.UUID === columnFormat)
                        && ColumnTypeEnum.STRING === columnType
                      ) {
                        data.format = null;
                      }

                      updateSchemaProperty(streamUUID, columnName, data);
                    }}
                    small
                  />
                </Spacing>
              ))}
            </FlexContainer>
          </Flex>

          {columnTypeOptions.length >= 1 && (
            <Select
              compact
              onChange={(e) => {
                const columnType = e.target.value;
                const data: SchemaPropertyType = {
                  format: columnFormat,
                  type: columnTypes,
                };

                if (COLUMN_TYPE_CUSTOM_DATE_TIME === String(columnType)) {
                  data.format = ColumnFormatEnum.DATE_TIME;
                  data.type.push(ColumnTypeEnum.STRING);
                } else if (ColumnFormatEnum.UUID === String(columnType)) {
                  data.format = ColumnFormatEnum.UUID;
                  data.type.push(ColumnTypeEnum.STRING);
                } else {
                  data.type.push(columnType);
                }

                updateSchemaProperty(streamUUID, columnName, data);
              }}
              primary
              small
              value=""
              width={10 * UNIT}
            >
              <option value="" />
              {columnTypeOptions}
            </Select>
          )}
        </FlexContainer>,
        <Checkbox
          checked={!!uniqueConstraints?.includes(columnName)}
          disabled={validKeyProperties.length >= 1 && !validKeyProperties.includes(columnName)}
          key={`${streamUUID}/${columnName}/unique`}
          onClick={(validKeyProperties.length >= 1 && !validKeyProperties.includes(columnName))
            ? null
            : () => updateStream(streamUUID, (stream: StreamType) => {
            if (stream.unique_constraints?.includes(columnName)) {
              stream.unique_constraints =
                remove(stream.unique_constraints, col => columnName === col);
            } else {
              stream.unique_constraints =
                [columnName].concat(stream.unique_constraints || []);
            }

            return stream;
          })}
        />,
        <Checkbox
          checked={!!bookmarkProperties?.includes(columnName)}
          disabled={validReplicationKeys.length >= 1 && !validReplicationKeys.includes(columnName)}
          key={`${streamUUID}/${columnName}/bookmark`}
          onClick={(validReplicationKeys.length >= 1 && !validReplicationKeys.includes(columnName))
            ? null
            : () => updateStream(streamUUID, (stream: StreamType) => {
            if (stream.bookmark_properties?.includes(columnName)) {
              removeBookmarkPropertyFromState(columnName);
              stream.bookmark_properties =
                remove(stream.bookmark_properties, col => columnName === col);
            } else {
              stream.bookmark_properties =
                [columnName].concat(stream.bookmark_properties || []);
            }

            return stream;
          })}
        />,
        <Checkbox
          checked={!!keyProperties?.includes(columnName)}
          key={`${streamUUID}/${columnName}/key_property`}
          onClick={() => updateStream(streamUUID, (stream: StreamType) => {
            if (stream.key_properties?.includes(columnName)) {
              stream.key_properties =
                remove(stream.key_properties, col => columnName === col);
            } else {
              stream.key_properties =
                [columnName].concat(stream.key_properties || []);
            }

            return stream;
          })}
        />,
      ];

      if (showPartitionKey) {
        const isNotDeltaLakeDestination = destination !== IntegrationDestinationEnum.DELTA_LAKE_S3;
        const disabled = isNotDeltaLakeDestination && (
          validKeyProperties.includes(columnName)
            || !columnTypesSetForAllowingPartitionKey.has(ColumnFormatEnum.DATE_TIME)
        );

        row.push(
          <Checkbox
            checked={!!partitionKeys?.includes(columnName)}
            disabled={disabled}
            key={`${streamUUID}/${columnName}/partition_key`}
            onClick={disabled ? null : () => updateStream(streamUUID, (stream: StreamType) => {
              if (stream.partition_keys?.includes(columnName)) {
                stream.partition_keys =
                  remove(stream.partition_keys, col => columnName === col);
              } else {
                // Only allow one partition key for now (except Delta Lake S3))
                if (isNotDeltaLakeDestination && stream.partition_keys?.length === 1) {
                  stream.partition_keys = [columnName];
                } else {
                  stream.partition_keys =
                    [columnName].concat(stream.partition_keys || []);
                }
              }

              return stream;
            })}
          />,
        );
      }

      if (hasMultipleStreams) {
        const isApplyingToAllStreamsWithFeature = isApplyingToAllStreamsIdx === rowIdx;
        row.push(
          <Button
            compact
            disabled={isApplyingToAllStreamsWithFeature}
            onClick={() => {
              setIsApplyingToAllStreamsIdx(rowIdx);
              setTimeout(() => setIsApplyingToAllStreamsIdx(null), 2000);
              updateAllStreams((stream: StreamType) => {
                if (stream?.tap_stream_id !== streamUUID && stream?.schema?.properties?.[columnName]) {
                  stream.schema.properties[columnName] = {
                    format: columnFormat || null,
                    type: columnTypes,
                  };
                  const currStreamMetadata = find(
                    stream?.metadata || [],
                    ({ breadcrumb }) => breadcrumb.length === 0,
                  )?.metadata;
                  const currStreamReplicationKeys = currStreamMetadata[MetadataKeyEnum.REPLICATION_KEYS] || [];
                  const currStreamKeyProperties = currStreamMetadata[MetadataKeyEnum.KEY_PROPERTIES] || [];

                  if (uniqueConstraints?.includes(columnName)
                    && !stream?.unique_constraints?.includes(columnName)
                    && currStreamKeyProperties.includes(columnName)
                  ) {
                    stream.unique_constraints = [columnName].concat(stream.unique_constraints || []);
                  } else if (!uniqueConstraints?.includes(columnName)
                    && stream?.unique_constraints?.includes(columnName)
                  ) {
                    stream.unique_constraints = remove(stream.unique_constraints, col => columnName === col);
                  }

                  if (bookmarkProperties?.includes(columnName)
                    && !stream?.bookmark_properties?.includes(columnName)
                    && (currStreamReplicationKeys.includes(columnName) || currStreamReplicationKeys.length === 0)
                  ) {
                    stream.bookmark_properties = [columnName].concat(stream.bookmark_properties || []);
                  } else if (!bookmarkProperties?.includes(columnName)
                    && stream?.bookmark_properties?.includes(columnName)
                  ) {
                    stream.bookmark_properties = remove(stream.bookmark_properties, col => columnName === col);
                  }

                  if (keyProperties?.includes(columnName) && !stream?.key_properties?.includes(columnName)) {
                    stream.key_properties = [columnName].concat(stream.key_properties || []);
                  } else if (!keyProperties?.includes(columnName) && stream?.key_properties?.includes(columnName)) {
                    stream.key_properties = remove(stream.key_properties, col => columnName === col);
                  }

                  if (partitionKeys?.includes(columnName) && !stream?.partition_keys?.includes(columnName)) {
                    stream.partition_keys = [columnName].concat(stream.partition_keys || []);
                  } else if (!partitionKeys?.includes(columnName) && stream?.partition_keys?.includes(columnName)) {
                    stream.partition_keys = remove(stream.partition_keys, col => columnName === col);
                  }
                }

                return {
                  ...stream,
                };
              });
            }}
            pill
            secondary
          >
            <Text
              success={isApplyingToAllStreamsWithFeature}
            >
              {isApplyingToAllStreamsWithFeature ? 'Applied!' : 'Apply'}
            </Text>
          </Button>,
        );
      }

      return row;
    });

    const allColumnsSelected: boolean = selectedArr.every(s => s);
    const columnFlex = [null, 2, 1, null, null, null];
    const columns: ColumnType[] = [
      {
        label: () => (
          <Checkbox
            checked={allColumnsSelected}
            onClick={() => {
              updateMetadataForColumns(streamUUID, selectableColumns, {
                selected: !allColumnsSelected,
              });
            }}
          />
        ),
        uuid: 'Selected',
      },
      {
        uuid: 'Name',
      },
      {
        uuid: 'Type',
      },
      {
        fitTooltipContentWidth: true,
        tooltipMessage: 'Used to avoid adding duplicate records',
        uuid: 'Unique',
      },
      {
        tooltipMessage: 'Used to keep track of sync progress and incrementally sync new \
          records (e.g. a column indicating when a record was last updated)',
        tooltipWidth: 305,
        uuid: 'Bookmark',
      },
      {
        fitTooltipContentWidth: true,
        tooltipMessage: 'Used to create primary key for destination table',
        uuid: 'Key prop',
      },
    ];

    if (showPartitionKey) {
      columnFlex.push(null);
      columns.push({
        uuid: 'Partition key',
      });
    }

    if (hasMultipleStreams) {
      columnFlex.push(null);
      columns.push({
        tooltipMessage: 'This will apply this individual feature\'s schema \
          settings to all selected streams that have the same feature. \
          Unique features must be valid key properties in other streams. \
          Bookmark features must be valid replication keys in other streams.',
        uuid: 'All streams',
      });
    }

    return (
      <TableContainerStyle>
        <Table
          alignTop
          columnFlex={columnFlex}
          columns={columns}
          rows={rows}
          stickyHeader
        />

      </TableContainerStyle>
    );
  }, [
    bookmarkProperties,
    destination,
    hasMultipleStreams,
    isApplyingToAllStreamsIdx,
    keyProperties,
    metadataByColumn,
    partitionKeys,
    properties,
    removeBookmarkPropertyFromState,
    showPartitionKey,
    streamUUID,
    uniqueConstraints,
    updateAllStreams,
    updateMetadataForColumns,
    updateSchemaProperty,
    updateStream,
    validKeyProperties,
    validReplicationKeys,
  ]);

  return (
    <>
      <Headline condensed level={4} spacingBelow>
        <Headline
          condensed
          inline
          level={4}
          monospace
        >
          {streamUUID}
        </Headline> schema
      </Headline>

      <Spacing mb={3}>
        <Panel
          headerTitle="Output"
          overflowVisible
        >
          <FlexContainer alignItems="center">
            <Text>
              Destination table name
            </Text>
            <Spacing ml={TOOLTIP_LEFT_SPACING} />
            <Tooltip
              {...SHARED_TOOLTIP_PROPS}
              label={(
                <Text>
                  By default, this stream will be saved to your destination under the
                  table named <Text bold inline monospace>
                    {streamUUID}
                  </Text>. To change the table name, enter in a different value.
                </Text>
              )}
            />
            <Spacing ml={1} />
            <TextInput
              compact
              monospace
              onChange={(e) => {
                const val = e.target.value;
                setDestinationTable(val);

                clearTimeout(timeout.current);
                timeout.current = setTimeout(() => {
                  updateStream(streamUUID, (streamCurrent: StreamType) => ({
                    ...streamCurrent,
                    destination_table: val,
                  }));
                }, 300);
              }}
              value={destinationTable || ''}
              width={45 * UNIT}
            />
          </FlexContainer>
        </Panel>
      </Spacing>

      <Spacing mb={3}>
        <Panel
          headerTitle="Usage"
          overflowVisible
        >
          <FlexContainer alignItems="center" justifyContent="space-between">
            <Flex alignItems="center">
              <Text>
                Replication method
              </Text>
              <Spacing ml={TOOLTIP_LEFT_SPACING} />
              <Tooltip
                {...SHARED_TOOLTIP_PROPS}
                label={(
                  <Text>
                    Do you want to synchronize the entire stream (<Text bold inline monospace>
                      {ReplicationMethodEnum.FULL_TABLE}
                    </Text>)
                    on each integration pipeline run or
                    only new records (<Text bold inline monospace>
                      {ReplicationMethodEnum.INCREMENTAL}
                    </Text>)?
                    {source === IntegrationSourceEnum.POSTGRESQL &&
                      <Text>
                        Log-based incremental replication (<Text bold inline monospace>
                          {ReplicationMethodEnum.LOG_BASED}
                        </Text>)
                        is also available for PostgreSQL sources.
                      </Text>
                    }
                  </Text>
                )}
              />
              <Spacing ml={1} />
              <Select
                compact
                onChange={(e) => {
                  updateStream(streamUUID, (stream: StreamType) => ({
                    ...stream,
                    replication_method: e.target.value,
                  }));
                }}
                primary
                value={replicationMethod}
              >
                <option value="" />
                {Object.values(ReplicationMethodEnum)
                  .filter(method => (source === IntegrationSourceEnum.POSTGRESQL
                    ? true
                    : method !== ReplicationMethodEnum.LOG_BASED))
                  .map(method => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                ))}
              </Select>

              <Spacing ml={3} />

              <Text>
                Unique conflict method
              </Text>
              <Spacing ml={TOOLTIP_LEFT_SPACING} />
              <Tooltip
                {...SHARED_TOOLTIP_PROPS}
                label={(
                  <Text wordBreak>
                    If a new record has the same value as an existing record in
                    the {pluralize('unique column', uniqueConstraints?.length)}
                    {uniqueConstraints?.length > 0 && <>&nbsp;</>}
                    {uniqueConstraints?.sort().map((col: string, idx: number) => (
                      <Text
                        bold
                        inline
                        key={col}
                        monospace
                      >
                        {uniqueConstraints?.length !== 1 && idx === uniqueConstraints?.length - 1
                          ? <Text inline key={col}> and </Text>
                          : (idx >= 1 && <>,&nbsp;</>)}
                        {col}
                      </Text>
                    ))}, how do you want to resolve the conflict?
                    The conflict method <Text bold inline monospace>
                      {UniqueConflictMethodEnum.IGNORE}
                    </Text> will skip the new record if it’s a duplicate of an existing record.
                    The conflict method <Text bold inline monospace>
                      {UniqueConflictMethodEnum.UPDATE}
                    </Text> will not save the new record and instead update the existing record
                    with the new record’s properties.
                  </Text>
                )}
              />
              <Spacing ml={1} />
              <Select
                compact
                inputWidth={UNIT * 11}
                onChange={(e) => {
                  updateStream(streamUUID, (stream: StreamType) => ({
                    ...stream,
                    unique_conflict_method: e.target.value,
                  }));
                }}
                primary
                value={uniqueConflictMethod}
              >
                <option value="" />
                <option value={UniqueConflictMethodEnum.IGNORE}>
                  {UniqueConflictMethodEnum.IGNORE}
                </option>
                <option value={UniqueConflictMethodEnum.UPDATE}>
                  {UniqueConflictMethodEnum.UPDATE}
                </option>
              </Select>
            </Flex>

            {hasMultipleStreams && (
              <Flex alignItems="center">
                <Text default>
                  All streams
                </Text>
                <Spacing ml={TOOLTIP_LEFT_SPACING} />
                <Tooltip
                  {...SHARED_TOOLTIP_PROPS}
                  appearBefore
                  label={(
                    <Text>
                      This will apply this stream&#39;s replication method and
                      unique conflict method settings to all selected streams.
                    </Text>
                  )}
                />
                <Spacing ml={1} />
                <Button
                  compact
                  disabled={isApplyingToAllStreams}
                  onClick={() => {
                    setIsApplyingToAllStreams(true);
                    setTimeout(() => setIsApplyingToAllStreams(false), 2000);
                    updateAllStreams((stream: StreamType) => ({
                      ...stream,
                      replication_method: replicationMethod,
                      unique_conflict_method: uniqueConflictMethod,
                    }));
                  }}
                  pill
                  secondary
                >
                  <Text
                    bold={!isApplyingToAllStreams}
                    success={isApplyingToAllStreams}
                  >
                    {isApplyingToAllStreams ? 'Applied!' : 'Apply'}
                  </Text>
                </Button>
              </Flex>
            )}
          </FlexContainer>
        </Panel>
      </Spacing>

      <Panel
        headerTitle="Features"
        noPadding
      >
        {tableMemo}
      </Panel>

      <Spacing mt={2}>
        <Button
          loading={isLoadingLoadSampleData}
          onClick={() => loadSampleData(streamUUID)}
          primary
          small
        >
          Load sample data
        </Button>
      </Spacing>

      <Spacing mt={5}>
        <Headline condensed level={4} spacingBelow>
          Settings
        </Headline>

        <Spacing mb={SPACING_BOTTOM_UNITS}>
          <Spacing mb={1}>
            <Text bold large>
              Run stream in parallel
            </Text>
            <Text default>
              Parallel streams will be run at the same time, so make sure there are no dependencies between them.
            </Text>
            <Spacing mb={1} />
            <ToggleSwitch
              checked={runInParallel}
              key={`${streamUUID}/run_in_parallel`}
              onCheck={() => updateStream(streamUUID, (stream: StreamType) => {
                stream.run_in_parallel = !runInParallel;
                return stream;
              })}
            />
          </Spacing>
        </Spacing>

        {ReplicationMethodEnum.INCREMENTAL === replicationMethod && (
          <Spacing mb={SPACING_BOTTOM_UNITS}>
            <Spacing mb={1}>
              <Text bold large>
                Bookmark properties
              </Text>
              <Text default>
                After each integration pipeline run, the last record that was successfully
                synchronized will be used as the bookmark.
                The properties listed below will be extracted from the last record and used
                as the bookmark.
                On the next run, the synchronization will start from the bookmarked record.
              </Text>
            </Spacing>

            <FlexContainer alignItems="center" flexWrap="wrap">
              {!bookmarkProperties?.length && (
                <Text italic>
                  Click the checkbox under the column <Text bold inline italic>
                    Bookmark
                  </Text> to
                  use a specific column as a bookmark property.
                </Text>
              )}
              {bookmarkProperties?.sort().map((columnName: string) => (
                <Spacing
                  key={`bookmark_properties/${columnName}`}
                  mb={1}
                  mr={1}
                >
                  <Chip
                    label={columnName}
                    onClick={() => {
                      removeBookmarkPropertyFromState(columnName);
                      updateStream(streamUUID, (stream: StreamType) => ({
                        ...stream,
                        bookmark_properties: remove(
                          stream.bookmark_properties || [],
                          (col: string) => col === columnName,
                        ),
                      }));
                    }}
                    primary
                  />
                </Spacing>
              ))}
            </FlexContainer>

            {bookmarkProperties?.length > 0 &&
              <>
                <Spacing my={2}>
                  <FlexContainer alignItems="center" justifyContent="space-between">
                    <Spacing mr={2}>
                      <Text bold large>
                        Manually edit bookmark property values
                      </Text>
                      {!destination && (
                        <Text default>
                          In order to overwrite the bookmark values for the next sync, you must first select a
                          destination. Then you will be able to edit the bookmark property values in the
                          table below. Click the &#34;Save&#34; button to save your changes.
                        </Text>
                      )}
                      {destination && (
                        <Text default>
                          This will temporarily overwrite the bookmark value for the next pipeline run. After
                          editing any bookmark values below, you must click the &#34;Save&#34; button in
                          the table header in order to persist and save your changes.
                        </Text>
                      )}
                    </Spacing>

                    <ToggleSwitch
                      checked={showBookmarkValuesTable}
                      disabled={!destination}
                      onCheck={() => setShowBookmarkPropertyTable(prevState => !prevState)}
                    />
                  </FlexContainer>
                </Spacing>
                {(showBookmarkValuesTable && !!destination) &&
                  <Panel
                    header={
                      <FlexContainer alignItems="center" justifyContent="space-between">
                        <Text bold default>
                          Bookmark property values
                        </Text>
                        <Button
                          compact
                          loading={isLoadingUpdateDestinationBlockState}
                          onClick={() => {
                            updateDestinationBlockState({
                              block: {
                                bookmark_values: bookmarkValues?.[streamUUID] || {},
                                destination_table: destinationTable,
                                tap_stream_id: streamUUID,
                              },
                            });
                          }}
                          pill
                          primary
                        >
                          Save
                        </Button>
                      </FlexContainer>
                    }
                    headerPaddingVertical={UNIT}
                    noPadding
                    overflowVisible
                  >
                    <Table
                      columnBorders
                      columnFlex={[null, 1]}
                      columns={[
                        {
                          uuid: 'Feature',
                        },
                        {
                          uuid: 'Current bookmark value',
                        },
                      ]}
                      rows={bookmarkProperties.map(bookmarkProperty => [
                        <Text
                          default
                          key={bookmarkProperty}
                          monospace
                        >
                          {bookmarkProperty}
                        </Text>,
                        <TextInput
                          borderless
                          key={`${bookmarkProperty}_value`}
                          monospace
                          onChange={(e) => {
                            e.preventDefault();
                            setBookmarkValues(prev => ({
                              ...prev,
                              [streamUUID]: {
                                ...prev[streamUUID],
                                [bookmarkProperty]: e.target.value || null,
                              },
                            }));
                          }}
                          paddingHorizontal={0}
                          placeholder="Enter value (optional)"
                          value={bookmarkValues?.[streamUUID]?.[bookmarkProperty]}
                        />,
                      ])}
                    />
                  </Panel>
                }
              </>
            }
          </Spacing>
        )}

        {(hasMultipleStreams && bookmarkProperties?.length > 0) &&
          <Spacing mb={SPACING_BOTTOM_UNITS}>
            <Text bold large>
              Valid replication keys
            </Text>
            <Text default inline>
              If a stream&#39;s schema specifies its valid replication keys and a feature
              is not a valid replication key, that feature will not be set as a bookmark property
              when applying the feature (from a different stream) as a bookmark to all
              streams.&nbsp;
            </Text>
            {validReplicationKeys.length > 0 && (
              <>
                <Text default inline>
                  These are the valid replication keys for this stream:
                </Text>&nbsp;
                <Text inline monospace small>{validReplicationKeys.join(', ')}.</Text>
              </>
            )}
            {validReplicationKeys.length === 0 &&
              <Text default inline>
                This stream did not specify any valid replication keys, so all features
                can be used as bookmark properties.
              </Text>
            }
          </Spacing>
        }

        <Spacing mb={SPACING_BOTTOM_UNITS}>
          <Spacing mb={1}>
            <Text bold large>
              Unique constraints
            </Text>
            <Text default>
              Multiple records (e.g. 2 or more) with the same values
              in the columns listed below will be considered duplicates.
            </Text>
          </Spacing>

          <FlexContainer alignItems="center" flexWrap="wrap">
            {!uniqueConstraints?.length && (
              <Text italic>
                Click the checkbox under the column <Text bold inline italic>
                  Unique
                </Text> to
                use a specific column as a unique constraint.
              </Text>
              )}
            {uniqueConstraints?.sort().map((columnName: string) => (
              <Spacing
                key={`unique_constraints/${columnName}`}
                mb={1}
                mr={1}
              >
                <Chip
                  label={columnName}
                  onClick={() => {
                    updateStream(streamUUID, (stream: StreamType) => ({
                      ...stream,
                      unique_constraints: remove(
                        stream.unique_constraints || [],
                        (col: string) => col === columnName,
                      ),
                    }));
                  }}
                  primary
                />
              </Spacing>
            ))}
          </FlexContainer>
        </Spacing>

        <Spacing mb={SPACING_BOTTOM_UNITS}>
          <Spacing mb={1}>
            <Text bold large>
              Key properties
            </Text>
            <Text default>
              Key properties are used as the primary key for the destination table.
            </Text>
          </Spacing>

          <FlexContainer alignItems="center" flexWrap="wrap">
            {!keyProperties?.length && (
              <Text italic>
                Click the checkbox under the column <Text bold inline italic>
                  Key prop
                </Text> to
                use a specific column as a key property.
              </Text>
              )}
            {keyProperties?.sort().map((columnName: string) => (
              <Spacing
                key={`key_properties/${columnName}`}
                mb={1}
                mr={1}
              >
                <Chip
                  label={columnName}
                  onClick={() => {
                    updateStream(streamUUID, (stream: StreamType) => ({
                      ...stream,
                      key_properties: remove(
                        stream.key_properties || [],
                        (col: string) => col === columnName,
                      ),
                    }));
                  }}
                  primary
                />
              </Spacing>
            ))}
          </FlexContainer>
        </Spacing>

        {showPartitionKey && (
          <Spacing mb={3}>
            <Spacing mb={1}>
              <Text bold large>
                Partition keys
              </Text>
              <Text default>
                One datetime column can be used to partition the table. (Note: Partition keys
                currently only work with BigQuery destinations. Support for other destinations is WIP.)
              </Text>
            </Spacing>

            <FlexContainer alignItems="center" flexWrap="wrap">
              {!partitionKeys?.length && (
                <Text italic>
                  Click the checkbox under the column <Text bold inline italic>
                    Partition key
                  </Text> to
                  use a specific column as a partition key.
                </Text>
                )}
              {partitionKeys?.sort().map((columnName: string) => (
                <Spacing
                  key={`key_properties/${columnName}`}
                  mb={1}
                  mr={1}
                >
                  <Chip
                    label={columnName}
                    onClick={() => {
                      updateStream(streamUUID, (stream: StreamType) => ({
                        ...stream,
                        partition_keys: remove(
                          stream.partition_keys || [],
                          (col: string) => col === columnName,
                        ),
                      }));
                    }}
                    primary
                  />
                </Spacing>
              ))}
            </FlexContainer>
          </Spacing>
        )}
      </Spacing>
    </>
  );
}

export default SchemaTable;
