import { useCallback, useMemo } from 'react';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Chip from '@oracle/components/Chip';
import FlexContainer from '@oracle/components/FlexContainer';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { Edit } from '@oracle/icons';
import {
  MetadataType,
  ReplicationMethodEnum,
  SchemaPropertyType,
  StreamType,
} from '@interfaces/IntegrationSourceType';
import { StreamsOverviewProps } from '../StreamsOverview';
import { UNIT } from '@oracle/styles/units/spacing';
import { appendArray, indexBy, remove, sortByKey } from '@utils/array';
import {
  buildMetadataForColumn,
  getSchemaPropertiesWithMetadata,
  getStreamID,
  getStreamIDWithParentStream,
  getStreamMetadataByColumn,
  getStreamMetadataFromMetadataArray,
  isStreamSelected,
  updateStreamInBlock,
  updateStreamMetadataForColumns,
  updateStreamPropertiesForColumns,
} from '@utils/models/block';
import { ignoreKeys } from '@utils/hash';

type StreamDetailSchemaPropertiesProps = {
  setBlockAttributes: (prev: any) => void;
  stream: StreamType;
} & StreamsOverviewProps;

function StreamDetailSchemaProperties({
  block,
  blocksMapping,
  setBlockAttributes,
  stream,
  streamMapping,
  updateStreamsInCatalog,
}: StreamDetailSchemaPropertiesProps) {
  const schemaProperties = useMemo(() => getSchemaPropertiesWithMetadata(stream) || {}, [
    stream,
  ]);

  const {
    bookmark_properties: bookmarkProperties,
    key_properties: keyProperties,
    partition_keys: partitionKeys,
    replication_method: replicationMethod,
    unique_constraints: uniqueConstraints,
  } = stream || {};

  const {
    bookmarkPropertiesMapping,
    keyPropertiesMapping,
    partitionKeysMapping,
    uniqueConstraintsMapping,
  } = useMemo(() => {

    return {
      bookmarkPropertiesMapping: indexBy(
        bookmarkProperties || [],
        i => i,
      ),
      keyPropertiesMapping: indexBy(
        keyProperties || [],
        i => i,
      ),
      partitionKeysMapping: indexBy(
        partitionKeys || [],
        i => i,
      ),
      uniqueConstraintsMapping: indexBy(
        uniqueConstraints || [],
        i => i,
      ),
    };
  }, [
    bookmarkProperties,
    keyProperties,
    partitionKeys,
    uniqueConstraints,
  ]);

  const schemaPropertiesSortedArray: {
    column: string;
    property: SchemaPropertyType;
  }[] = useMemo(() => sortByKey(
    Object.entries(schemaProperties || {}),
    ([column,]) => column,
  )?.map?.(([
    column,
    property
  ]) => ({
    column,
    property,
  })), [
    schemaProperties,
  ]);

  const metadataForStream: MetadataType =
    useMemo(() => getStreamMetadataFromMetadataArray(stream), [stream]);
  const streamMetadataByColumn: {
    [column: string]: MetadataType;
  } = useMemo(() => getStreamMetadataByColumn(stream), [stream]);

  const {
    columnFlex,
    columns,
  } = useMemo(() => {
    const columnFlexInner = [null, 1, 1, null];

    const allColumnsSelected =
      schemaPropertiesSortedArray?.every(({
        property
      }) => !property?.metadata
        || !property?.metadata?.metadata
        || property?.metadata?.metadata?.selected,
      );

    const updateAll = (opts: {
      selected?: boolean;
    }) => {
      const mapping = schemaPropertiesSortedArray?.reduce((acc, {
        column,
      }) => {
        const md = streamMetadataByColumn?.[column] || buildMetadataForColumn(column);

        acc[column] = {
          ...md,
          metadata: {
            ...md?.metadata,
            ...opts,
          },
        }

        return acc;
      }, {});

      setBlockAttributes(prev => updateStreamInBlock(
        updateStreamMetadataForColumns(stream, mapping),
        prev,
      ));
    };

    const columnsInner = [
      {
        label: () => (
          <ToggleSwitch
            checked={allColumnsSelected}
            compact
            onCheck={(valFunc: (val: boolean) => boolean) => updateAll({
              selected: valFunc(allColumnsSelected),
            })}
          />
        ),
        uuid: 'action',
      },
      {
        uuid: 'Column',
      },
      {
        uuid: 'Types',
      },
      {
        center: true,
        uuid: 'Unique',
      },
    ];

    if (ReplicationMethodEnum.INCREMENTAL === replicationMethod) {
      columnFlexInner.push(null);
      columnsInner.push({
        center: true,
        uuid: 'Bookmark',
      });
    }

    columnFlexInner.push(...[null, null])
    columnsInner.push(...[
      {
        center: true,
        uuid: 'Key',
      },
      {
        center: true,
        uuid: 'Partition',
      },
    ]);

    return {
      columnFlex: columnFlexInner,
      columns: columnsInner,
    };
  }, [
    replicationMethod,
    schemaPropertiesSortedArray,
    setBlockAttributes,
    streamMetadataByColumn,
  ]);

  const rows = useMemo(() => schemaPropertiesSortedArray?.map(({
    column,
    property,
  }: {
    column: string;
    property: SchemaPropertyType;
  }) => {
    const {
      any,
      format,
      metadata,
      type: columnTypes,
    }: SchemaPropertyType = property;
    const isSelected = !metadata || !metadata?.metadata || metadata?.metadata?.selected;
    const isUnique = uniqueConstraintsMapping?.[column];
    const isBookmark = bookmarkPropertiesMapping?.[column];
    const isKeyProperty = keyPropertiesMapping?.[column];
    const isPartitionKey = partitionKeysMapping?.[column];

    const row = [
      <ToggleSwitch
        checked={isSelected}
        compact
        key={`${column}-selected`}
        onCheck={(valFunc: (val: boolean) => boolean) => {
          setBlockAttributes(prev => updateStreamInBlock(
            updateStreamMetadataForColumns(stream, {
              [column]: {
                ...metadata,
                metadata: {
                  ...metadata?.metadata,
                  selected: valFunc(isSelected),
                },
              },
            }),
            prev,
          ));
        }}
      />,
      <Text key={`${column}-column`}>
        {column}
      </Text>,
      <FlexContainer
        alignItems="center"
        flexWrap="wrap"
        key={`${column}-types`}
      >
        {sortByKey(columnTypes || [], i => i)?.map((columnType: string) => (
          <div key={`${column}-types-${columnType}`} style={{ marginRight: UNIT / 2 }}>
            <Chip
              label={columnType}
              onClick={() => {
                setBlockAttributes(prev => updateStreamInBlock(
                  updateStreamPropertiesForColumns(stream, {
                    [column]: {
                      any,
                      format,
                      type: remove(columnTypes, i => i === columnType),
                    },
                  }),
                  prev,
                ));
              }}
              xsmall
            />
          </div>
        ))}
        <Button
          iconOnly
          noBackground
          noBorder
          noPadding
          onClick={() => {
            alert('EDIT');
          }}
        >
          <Edit default />
        </Button>
      </FlexContainer>,
      <FlexContainer
        alignItems="center"
        justifyContent="center"
        key={`${column}-unique`}
      >
        <Checkbox
          checked={isUnique}
          onClick={() => {
            setBlockAttributes(prev => updateStreamInBlock(
              {
                ...stream,
                unique_constraints: isUnique
                  ? remove(uniqueConstraints || [], i => i === column)
                  : appendArray(column, uniqueConstraints || [])
              },
              prev,
            ));
          }}
        />
      </FlexContainer>,
    ];

    const rowSetups = [];

    if (ReplicationMethodEnum.INCREMENTAL === replicationMethod) {
      rowSetups.push([
        isBookmark,
        'bookmark_properties',
        bookmarkProperties,
      ]);
    }

    rowSetups.push(...[
      [
        isKeyProperty,
        'key_properties',
        keyProperties,
      ],
      [
        isPartitionKey,
        'partition_keys',
        partitionKeys,
      ],
    ]);

    rowSetups.forEach(([
      value,
      key,
      arrayOfValues,
    ]) => {
      row.push(
        <FlexContainer
          alignItems="center"
          justifyContent="center"
          key={`${column}-${key}`}
        >
          <Checkbox
            checked={value}
            onClick={() => {
              setBlockAttributes(prev => updateStreamInBlock(
                {
                  ...stream,
                  [key]: value
                    ? remove(arrayOfValues || [], i => i === column)
                    : appendArray(column, arrayOfValues || [])
                },
                prev,
              ));
            }}
          />
        </FlexContainer>
      );
    });

    return row;
  }), [
    bookmarkProperties,
    bookmarkPropertiesMapping,
    keyProperties,
    keyPropertiesMapping,
    partitionKeys,
    partitionKeysMapping,
    replicationMethod,
    schemaProperties,
    schemaPropertiesSortedArray,
    setBlockAttributes,
    stream,
    uniqueConstraints,
    uniqueConstraintsMapping,
  ]);

  const tableMemo = useMemo(() => {

    return (
      <Table
        columnFlex={columnFlex}
        columns={columns}
        rows={rows}
      />
    );
  }, [
    columnFlex,
    columns,
    rows,
  ]);

  return tableMemo;
}

export default StreamDetailSchemaProperties;
