import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Checkbox from '@oracle/elements/Checkbox';
import Chip from '@oracle/components/Chip';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import usePrevious from '@utils/usePrevious';
import {
  COLUMN_TYPES,
  COLUMN_TYPE_CUSTOM_DATE_TIME,
  ColumnFormatEnum,
  ColumnTypeEnum,
  InclusionEnum,
  IntegrationDestinationEnum,
  IntegrationSourceEnum,
  PropertyMetadataType,
  ReplicationMethodEnum,
  SchemaPropertyType,
  StreamType,
  UniqueConflictMethodEnum,
} from '@interfaces/IntegrationSourceType';
import { TableContainerStyle } from '../index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { find, indexBy, remove, sortTuplesArrayByFirstItem } from '@utils/array';
import { pluralize } from '@utils/string';

const SPACING_BOTTOM_UNITS = 5;

export type SchemaTableProps = {
  destination: IntegrationDestinationEnum;
  source: IntegrationSourceEnum;
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

const PARTITION_KEY_DESTINATIONS = ['bigquery'];

function SchemaTable({
  destination,
  source,
  stream,
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
    schema: {
      properties,
    },
    tap_stream_id: streamUUID,
    unique_constraints: uniqueConstraints,
    unique_conflict_method: uniqueConflictMethod,
  } = stream;

  const [destinationTable, setDestinationTable] = useState<string>(destinationTableInit);

  const streamUUIDPrev = usePrevious(streamUUID);
  useEffect(() => {
    if (streamUUIDPrev !== streamUUID) {
      setDestinationTable(destinationTableInit);
    }
  }, [
    destinationTableInit,
    streamUUID,
    streamUUIDPrev,
  ]);

  const metadataByColumn = useMemo(() => indexBy(metadata, ({ breadcrumb }) => breadcrumb.join('/')), [
    metadata,
  ]);
  const metadataForStream =
    useMemo(() => find(metadata, ({ breadcrumb }) => breadcrumb.length === 0)?.metadata, [metadata]);
  const validKeyProperties = useMemo(() => metadataForStream['table-key-properties'] || [], [
    metadataForStream,
  ]);
  const validReplicationKeys = useMemo(() => metadataForStream['valid-replication-keys'] || [], [
    metadataForStream,
  ]);

  const showPartitionKey = PARTITION_KEY_DESTINATIONS.includes(destination);

  const tableMemo = useMemo(() => {
    const selectedArr = [];
    const selectableColumns = [];

    const rows = sortTuplesArrayByFirstItem(Object.entries(properties)).map(([
      columnName, {
        anyOf: columnTypesAnyOf = [],
        format: columnFormat,
        type: columnTypesInit = [],
      },
    ]) => {
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
      if (InclusionEnum.AUTOMATIC !== inclusion) {
        selectableColumns.push(columnName);
      }

      const columnTypeOptions = COLUMN_TYPES.reduce((acc, colType: ColumnTypeEnum) => {
        if (columnTypes.indexOf(colType) >= 0 || (
          COLUMN_TYPE_CUSTOM_DATE_TIME === String(colType)
            && ColumnFormatEnum.DATE_TIME === columnFormat
        )) {
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
          disabled={InclusionEnum.AUTOMATIC === inclusion}
          key={`${streamUUID}/${columnName}/selected`}
          onClick={InclusionEnum.AUTOMATIC === inclusion
            ? null
            : () => {
              updateMetadataForColumns(streamUUID, [columnName], {
                selected: !selected,
              });
            }
          }
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
                    label={ColumnFormatEnum.DATE_TIME === columnFormat &&
                        ColumnTypeEnum.STRING === columnType &&
                        indexOfFirstStringType === idx
                      ? COLUMN_TYPE_CUSTOM_DATE_TIME
                      : columnType
                    }
                    onClick={() => {
                      const data: SchemaPropertyType = {
                        format: columnFormat,
                        type: columnTypes.filter((colType: ColumnTypeEnum) =>
                          colType !== columnType),
                      };

                      if (ColumnFormatEnum.DATE_TIME === columnFormat &&
                        ColumnTypeEnum.STRING === columnType
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
        row.push(
          <Checkbox
            checked={!!partitionKeys?.includes(columnName)}
            disabled={validKeyProperties.includes(columnName)
              || !columnTypesSetForAllowingPartitionKey.has(ColumnFormatEnum.DATE_TIME)}
            key={`${streamUUID}/${columnName}/partition_key`}
            onClick={(validKeyProperties.includes(columnName)
              || !columnTypesSetForAllowingPartitionKey.has(ColumnFormatEnum.DATE_TIME))
              ? null
              : () => updateStream(streamUUID, (stream: StreamType) => {

              if (stream.partition_keys?.includes(columnName)) {
                stream.partition_keys =
                  remove(stream.partition_keys, col => columnName === col);
              } else {
                // only allow one partition key for now
                if (stream.partition_keys?.length === 1) {
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

      return row;
    });

    const allColumnsSelected: boolean = selectedArr.every(s => s);
    const columnFlex = [null, 2, 1, null, null, null];
    const columns = [
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
        uuid: 'Unique',
      },
      {
        uuid: 'Bookmark',
      },
      {
        uuid: 'Key prop',
      },
    ];

    if (showPartitionKey) {
      columnFlex.push(null);
      columns.push({
        uuid: 'Partition key',
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
    properties,
    showPartitionKey,
    stream,
    streamUUID,
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
        <Text bold large>
          Table name (optional)
        </Text>
        <Text default>
          By default, this stream will be saved to your destination under the
          table named <Text bold inline monospace>
            {streamUUID}
          </Text>.
          <br />
          To change the table name, enter in a different value below.
        </Text>

        <Spacing mt={1}>
          <TextInput
            label="Table name"
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
          />
        </Spacing>
      </Spacing>

      {tableMemo}

      <Spacing mt={5}>
        <Headline condensed level={4} spacingBelow>
          Settings
        </Headline>

        <Spacing mb={SPACING_BOTTOM_UNITS}>
          <Spacing mb={1}>
            <Text bold large>
              Replication method
            </Text>
            <Text default>
              Do you want to synchronize the entire stream (<Text bold inline monospace>
                {ReplicationMethodEnum.FULL_TABLE}
              </Text>)
              on each integration pipeline run or
              only new records (<Text bold inline monospace>
                {ReplicationMethodEnum.INCREMENTAL}
              </Text>)?
              {source === IntegrationSourceEnum.POSTGRESQL &&
                <Text default>
                  Log-based incremental replication (<Text bold inline monospace>
                    {ReplicationMethodEnum.LOG_BASED}
                  </Text>)
                  is also available for PostgreSQL sources.
                </Text>
              }
            </Text>
          </Spacing>

          <Select
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
        </Spacing>

        {ReplicationMethodEnum.INCREMENTAL === replicationMethod && (
          <Spacing mb={SPACING_BOTTOM_UNITS}>
            <Spacing mb={1}>
              <Text bold large>
                Bookmark properties
              </Text>
              <Text default>
                After each integration pipeline run,
                the last record that was successfully synchronized
                will be used as the bookmark.
                The properties listed below will be extracted from the last record and used
                as the bookmark.

                <br />

                On the next run, the synchronization will start after the bookmarked record.
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
          </Spacing>
        )}

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

        {uniqueConstraints?.length > 0 &&
          <Spacing mb={SPACING_BOTTOM_UNITS}>
            <Spacing mb={1}>
              <Text bold large>
                Unique conflict method
              </Text>
              <Text default>
                If a new record has the same value as an existing record
                in the {pluralize('column', uniqueConstraints?.length)} {uniqueConstraints?.sort().map((col: string, idx: number) => (
                  <Text
                    bold
                    inline
                    key={col}
                    monospace
                  >
                    {idx >= 1 && <>,&nbsp;</>}
                    {col}
                  </Text>
                ))}, how do you want to resolve the conflict?

                <br />

                The conflict method <Text bold inline monospace>
                  {UniqueConflictMethodEnum.IGNORE}
                </Text> will skip the new record if it’s a duplicate of an existing record.
                The conflict method <Text bold inline monospace>
                  {UniqueConflictMethodEnum.UPDATE}
                </Text> will not save the new record and instead update the existing record
                with the new record’s properties.
              </Text>
            </Spacing>

            <Select
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
          </Spacing>
        }
      </Spacing>
    </>
  );
}

export default SchemaTable;
