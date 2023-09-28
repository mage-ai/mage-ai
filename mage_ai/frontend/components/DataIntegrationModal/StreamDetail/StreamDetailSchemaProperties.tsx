import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Chip from '@oracle/components/Chip';
import Circle from '@oracle/elements/Circle';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel/v2';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { Close, Edit } from '@oracle/icons';
import {
  COLUMN_TYPES,
  MetadataType,
  ReplicationMethodEnum,
  SchemaPropertyType,
  StreamType,
} from '@interfaces/IntegrationSourceType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { StreamDetailProps } from './constants';
import { StreamsOverviewProps } from '../StreamsOverview';
import { appendArray, indexBy, remove, sortByKey } from '@utils/array';
import {
  PropertyColumnMoreType,
  addTypesToProperty,
  buildMetadataForColumn,
  getSchemaPropertiesWithMetadata,
  getStreamID,
  getStreamIDWithParentStream,
  getStreamMetadataByColumn,
  getStreamMetadataFromMetadataArray,
  hydrateProperty,
  isStreamSelected,
  removeTypesFromProperty,
  updateStreamInBlock,
  updateStreamMetadataForColumns,
  updateStreamPropertiesForColumns,
} from '@utils/models/block';
import { ignoreKeys } from '@utils/hash';
import { pauseEvent } from '@utils/events';

function StreamDetailSchemaProperties({
  block,
  blocksMapping,
  highlightedColumnsMapping,
  onChangeBlock,
  setBlockAttributes: setBlockAttributesProp,
  setHighlightedColumnsMapping,
  stream,
  streamMapping,
}: StreamDetailProps) {
  const setBlockAttributes = useCallback((prev1) => {
    setBlockAttributesProp((prev2) => {
      const blockUpdated = prev1(prev2);

      onChangeBlock?.(blockUpdated);

      return blockUpdated;
    });
  }, [
    onChangeBlock,
    setBlockAttributesProp,
  ]);

  const schemaProperties:{
    [column: string]: SchemaPropertyType;
  } = useMemo(() => getSchemaPropertiesWithMetadata(stream) || {}, [
    stream,
  ]);

  const [propertyFocused, setPropertyFocused] = useState<PropertyColumnMoreType>(null);

  const refTable = useRef(null);
  const [coordinates, setCoordinates] = useState<{
    x: number;
    y: number;
  }>(null);

  const handleClick = useCallback(() => {
    setCoordinates(null);
    setPropertyFocused(null);
  }, [
    setCoordinates,
    setPropertyFocused,
  ]);
  useEffect(() => {
    document?.addEventListener('click', handleClick);

    return () => {
      document?.removeEventListener('click', handleClick);
    };
  }, [
    handleClick,
  ]);


  const {
    bookmarkPropertiesMapping,
    keyPropertiesMapping,
    partitionKeysMapping,
    uniqueConstraintsMapping,
  } = useMemo(() => {
    const {
      bookmark_properties: bookmarkProperties,
      key_properties: keyProperties,
      partition_keys: partitionKeys,
      replication_method: replicationMethod,
      unique_constraints: uniqueConstraints,
    } = stream;

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
    stream,
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
        uuid: 'Property',
      },
      {
        uuid: 'Types',
      },
      {
        center: true,
        uuid: 'Unique',
      },
    ];

    const {
      replication_method: replicationMethod,
    } = stream;

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
    schemaPropertiesSortedArray,
    setBlockAttributes,
    stream,
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
      bookmark_properties: bookmarkProperties,
      key_properties: keyProperties,
      partition_keys: partitionKeys,
      replication_method: replicationMethod,
      unique_constraints: uniqueConstraints,
    } = stream;
    const {
      anyOf,
      format,
      metadata,
      type: columnTypes,
    }: SchemaPropertyType = property;
    const p2: PropertyColumnMoreType = hydrateProperty(column, property);
    const typesDerived = p2?.typesDerived || [];

    const isSelected = !metadata || !metadata?.metadata || metadata?.metadata?.selected;
    const isUnique = uniqueConstraintsMapping?.[column];
    const isBookmark = bookmarkPropertiesMapping?.[column];
    const isKeyProperty = keyPropertiesMapping?.[column];
    const isPartitionKey = partitionKeysMapping?.[column];

    const row = [
      <div
        key={`${column}-selected`}
        style={{ minHeight: 22 }}
      >
        <ToggleSwitch
          checked={isSelected}
          compact
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
        />
      </div>,
      <Text key={`${column}-column`} monospace>
        {column}
      </Text>,
      <FlexContainer
        alignItems="center"
        flexWrap="wrap"
        key={`${column}-types`}
      >
        {(typesDerived || [])?.map((columnType: string) => (
          <div
            key={`${column}-types-${columnType}`}
            style={{
              paddingBottom: 1,
              marginRight: 2,
              paddingTop: 1,
             }}
          >
            <Chip
              label={columnType}
              onClick={(e) => {
                pauseEvent(e);

                const isSelected = !!typesDerived?.includes(columnType);

                const propUpdated1 = isSelected
                  ? removeTypesFromProperty([columnType], p2)
                  : addTypesToProperty([columnType], p2);

                const propUpdated2 = {
                  anyOf: propUpdated1?.anyOf,
                  format: propUpdated1?.format,
                  type: propUpdated1?.type,
                };

                setBlockAttributes(prev => updateStreamInBlock(
                  updateStreamPropertiesForColumns(stream, {
                    [column]: propUpdated2,
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
          onClick={(e) => {
            pauseEvent(e);
            setCoordinates({
              // @ts-ignore
              x: e.pageX,
              // @ts-ignore
              y: e.pageY,
            });
            setPropertyFocused(p2);
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
          onClick={(e) => {
            pauseEvent(e);
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
            onClick={(e) => {
              pauseEvent(e);
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
    bookmarkPropertiesMapping,
    keyPropertiesMapping,
    partitionKeysMapping,
    schemaProperties,
    schemaPropertiesSortedArray,
    setBlockAttributes,
    setCoordinates,
    setPropertyFocused,
    stream,
    uniqueConstraintsMapping,
  ]);

  const getSchemaPropertyAndHighlightedByIndex =
    useCallback((index: number) => {
      const d = schemaPropertiesSortedArray?.[index];

      return {
        ...d,
        highlighted: !!highlightedColumnsMapping?.[d?.column],
      };
    }, [
      highlightedColumnsMapping,
      schemaPropertiesSortedArray,
    ]);

  const rowMenu = useMemo(() => {
    if (!coordinates || !propertyFocused) {
      return;
    }

    const menuWidth = UNIT * 21;

    const {
      x: xContainer,
      width,
    } = refTable?.current?.getBoundingClientRect() || {};
    const {
      x = 0,
      y = 0,
    } = coordinates || {};
    let xFinal = x;
    if (x + menuWidth >= xContainer + width) {
      xFinal = (xContainer + width) - (menuWidth + UNIT);
    }
    if (xFinal < 0) {
      xFinal = 0;
    }

    const p1 = schemaProperties?.[propertyFocused?.uuid] || {};
    const p2 = hydrateProperty(propertyFocused?.uuid, p1 || {});

    const {
      typesDerived = [],
      uuid: column,
    } = p2 || {};

    return (
      <div
        onClick={pauseEvent}
        style={{
          left: xFinal,
          position: 'fixed',
          top: y + (UNIT / 2),
          width: menuWidth,
          zIndex: 100,
        }}
      >
        <Panel>
          <div style={{ position: 'relative' }}>
            <Button
              iconOnly
              noBackground
              noBorder
              noPadding
              onClick={(e) => {
                pauseEvent(e);
                setCoordinates(null);
                setPropertyFocused(null);
              }}
              style={{
                position: 'absolute',
                right: -0.5 * UNIT,
                top: -0.5 * UNIT,
                zIndex: 1,
              }}
            >
              <Circle default size={2.5 * UNIT}>
                <Close size={1.5 * UNIT} />
              </Circle>
            </Button>
          </div>

          <Spacing p={PADDING_UNITS}>
            {COLUMN_TYPES.map((columnType: string, idx: number) => {
              const isSelected = !!typesDerived?.includes(columnType);

              return (
                <div key={columnType} style={{ marginTop: idx === 0 ? 0 : 4 }}>
                  <FlexContainer alignItems="center">
                    <Checkbox
                      checked={isSelected}
                      label={columnType}
                      onClick={(e) => {
                        pauseEvent(e);

                        const propUpdated1 = isSelected
                          ? removeTypesFromProperty([columnType], p2)
                          : addTypesToProperty([columnType], p2);

                        const propUpdated2 = {
                          anyOf: propUpdated1?.anyOf,
                          format: propUpdated1?.format,
                          type: propUpdated1?.type,
                        };

                        setBlockAttributes(prev => updateStreamInBlock(
                          updateStreamPropertiesForColumns(stream, {
                            [column]: propUpdated2,
                          }),
                          prev,
                        ));
                      }}
                    />
                  </FlexContainer>
                </div>
              );
            })}
          </Spacing>
        </Panel>
      </div>
    );
  }, [
    coordinates,
    propertyFocused,
    refTable,
    schemaProperties,
    setBlockAttributes,
    setCoordinates,
    setPropertyFocused,
    stream,
  ]);

  const tableMemo = useMemo(() => {
    return (
      <Table
        columnFlex={columnFlex}
        columns={columns}
        highlightRowOnHover
        isSelectedRow={(index: number) => getSchemaPropertyAndHighlightedByIndex(
          index,
        )?.highlighted}
        menu={rowMenu}
        onClickRow={(index: number) => {
          const {
            column,
            highlighted,
          } = getSchemaPropertyAndHighlightedByIndex(index);

          setHighlightedColumnsMapping(prev => highlighted
            ? ignoreKeys(prev, [column])
            : { ...prev, [column]: true }
          );
        }}
        ref={refTable}
        rows={rows}
        stickyHeader
      />
    );
  }, [
    columnFlex,
    columns,
    getSchemaPropertyAndHighlightedByIndex,
    refTable,
    rowMenu,
    rows,
    setHighlightedColumnsMapping,
  ]);


  return tableMemo;
}

export default StreamDetailSchemaProperties;
