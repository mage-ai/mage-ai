import { useMemo } from 'react';

import BlockType, { BlockLanguageEnum, BlockTypeEnum, TagEnum } from '@interfaces/BlockType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import {
  BreadcrumbEnum,
  COLUMN_TYPES,
  COLUMN_TYPE_CUSTOM_DATE_TIME,
  ColumnFormatEnum,
  ColumnFormatMapping,
  ColumnTypeEnum,
  InclusionEnum,
  MetadataType,
  PropertyMetadataType,
  SchemaPropertyType,
  StreamType,
} from '@interfaces/IntegrationSourceType';
import { ConfigurationDataIntegrationType } from '@interfaces/ChartBlockType';
import { equals, indexBy, remove, sortByKey } from '@utils/array';
import { isEmptyObject, isEqual, selectEntriesWithValues } from '@utils/hash';

export enum AttributeUUIDEnum {
  AUTO_ADD_NEW_FIELDS = 'auto_add_new_fields',
  BOOKMARK_PROPERTIES = 'bookmark_properties',
  DISABLE_COLUMN_TYPE_CHECK = 'disable_column_type_check',
  KEY_PROPERTIES = 'key_properties',
  PARTITION_KEYS = 'partition_keys',
  PROPERTY_SELECTED = 'property_selected',
  REPLICATION_METHOD = 'replication_method',
  RUN_IN_PARALLEL = 'run_in_parallel',
  UNIQUE_CONFLICT_METHOD = 'unique_conflict_method',
  UNIQUE_CONSTRAINTS = 'unique_constraints',
}

export type AttributesMappingType = {
  [attribute: string]: {
    selected: boolean;
    value?: boolean | number | string;
  };
};

export type ColumnsMappingType = {
  [column: string]: boolean;
};

export type PropertyColumnWithUUIDType = {
  uuid: string;
} & SchemaPropertyType;

export type PropertyColumnMoreType = {
  typesDerived: string[] | ColumnFormatEnum[] | ColumnTypeEnum[];
} & PropertyColumnWithUUIDType;

export interface StreamDifferencesType {
  newColumnSettings: {
    [column: string]: SchemaPropertyType;
  };
  newColumns: string[];
  stream: StreamType;
}

export interface StreamMapping {
  noParents: {
    [stream: string]: StreamType & {

    };
  };
  parents: {
    [stream: string]: StreamType & {

    };
  };
}

export function getLeafNodes(
  block: BlockType,
  attributeKey: string,
  blocks: BlockType[],
  opts: {
    includeAllNodes: boolean;
  } = {
    includeAllNodes: false,
  },
): BlockType[] {
  const blocksMapping = indexBy(blocks, ({ uuid }) => uuid);

  const {
    includeAllNodes,
  } = opts || {};
  const leafs: BlockType[] = [];

  function _getLeafNodes(blockInner: BlockType) {
    if (!blockInner) {
      return;
    }

    const arr: BlockType[] = (blockInner[attributeKey] || [])
      .reduce((acc, uuid: string) => {
        if (block.uuid === uuid) {
          return acc;
        }

        return acc.concat(blocksMapping[uuid]);
      }, []);
    if (arr.length === 0 || (includeAllNodes && block.uuid !== blockInner.uuid)) {
      leafs.push(blockInner);
    }

    arr.forEach((block3: BlockType) => {
      _getLeafNodes(block3);
    });
  }

  _getLeafNodes(block);

  return leafs;
}

export function getAllAncestors(block: BlockType, blocks: BlockType[]): BlockType[] {
  return getLeafNodes(block, 'upstream_blocks', blocks, {
    includeAllNodes: true,
  });
}

function getUpstreamDynamicAndReduceOutput(block: BlockType, blocks: BlockType[]): {
  dynamicUpstreamBlock?: BlockType;
  dynamicUpstreamBlocks: BlockType[];
  reduceOutputUpstreamBlock?: BlockType;
  reduceOutputUpstreamBlocks: BlockType[];
} {
  const ancestors = getAllAncestors(block, blocks);
  const dynamicUpstreamBlocks = ancestors.filter(({
    configuration,
    uuid,
  }) => configuration?.dynamic && uuid !== block?.uuid);
  const reduceOutputUpstreamBlocks = ancestors.filter(({
    configuration,
    uuid,
  }) => configuration?.reduce_output && uuid !== block?.uuid);

  return {
    dynamicUpstreamBlock: dynamicUpstreamBlocks[0],
    dynamicUpstreamBlocks,
    reduceOutputUpstreamBlock: reduceOutputUpstreamBlocks[0],
    reduceOutputUpstreamBlocks,
  };
}

export function useDynamicUpstreamBlocks(blocksToUse: BlockType[], blocks: BlockType[]): {
  block: BlockType,
  dynamic: boolean;
  dynamicUpstreamBlock?: BlockType;
  reduceOutput: boolean;
  reduceOutputUpstreamBlock?: BlockType;
}[] {
  return useMemo(() => blocksToUse.map((block: BlockType) => {
    const {
      dynamicUpstreamBlock,
      dynamicUpstreamBlocks,
      reduceOutputUpstreamBlock,
      reduceOutputUpstreamBlocks,
    } = getUpstreamDynamicAndReduceOutput(block, blocks);

    const {
      configuration
    } = block || {};
    const {
      dynamic,
      reduce_output: reduceOutput,
    } = configuration || {};

    return {
      block,
      blocksToUse,
      dynamic: !!dynamic,
      dynamicUpstreamBlock,
      dynamicUpstreamBlocks,
      reduceOutput: !!reduceOutput,
      reduceOutputUpstreamBlock,
      reduceOutputUpstreamBlocks,
    };
  }), [
    blocks,
    blocks?.map(({ configuration }) => configuration?.dynamic),
    blocks?.map(({ configuration }) => configuration?.reduce_output),
    blocks?.map(({ upstream_blocks: ub }) => ub),
  ]);
}

export function isDataIntegrationBlock(block: BlockType, pipeline: PipelineType = null) {
  const {
    configuration,
    language,
    type: blockType,
  } = block || {};
  const {
    data_integration: dataIntegration,
  } = configuration || {};

  const isCorrectBlockType = [
    BlockTypeEnum.DATA_LOADER,
    BlockTypeEnum.DATA_EXPORTER,
  ].includes(blockType);

  if (PipelineTypeEnum.PYTHON === pipeline?.type && isCorrectBlockType) {
    if (BlockLanguageEnum.YAML === language) {
      return true;
    }

    if (BlockLanguageEnum.PYTHON === language && dataIntegration) {
      return true;
    }
  }

  return false;
}

export function getStreamID(stream: StreamType) {
  return stream?.stream || stream?.tap_stream_id;
}

export function getParentStreamID(stream: StreamType): string {
  return stream?.parent_stream;
}

export function getStreamIDWithParentStream(stream: StreamType) {
  const parentStream = getParentStreamID(stream);
  const id = getStreamID(stream);

  return  [parentStream, id].filter(i => i).join('/');
}

export function isMetadataForStreamFromMetadataArray(metadata: MetadataType): boolean {
  return metadata?.breadcrumb?.length === 0;
}

export function getStreamMetadataFromMetadataArray(stream: StreamType): MetadataType {
  return stream?.metadata?.find(isMetadataForStreamFromMetadataArray) || {
    breadcrumb: [],
    metadata: {},
  };
}

export function updateStreamInBlock(stream: StreamType, block: BlockType) {
  const catalog = block?.catalog || {
    streams: [],
  };
  const streams = [...(catalog?.streams || [])];

  const index = streams?.findIndex(
    (s: StreamType) => getStreamIDWithParentStream(s) === getStreamIDWithParentStream(stream),
  );

  if (index >= 0) {
    streams[index] = stream;
  } else {
    streams.push(stream);
  }

  return {
    ...block,
    catalog: {
      ...catalog,
      streams,
    },
  };
}

export function updateStreamMetadata(streamInit: StreamType, payload: PropertyMetadataType): StreamType {
  const stream = { ...streamInit };
  if (!stream?.metadata) {
    stream.metadata = [];
  }

  const index = stream?.metadata?.findIndex(isMetadataForStreamFromMetadataArray);

  let metadata = {
    breadcrumb: [],
    metadata: {},
  };
  if (index >= 0) {
    metadata = getStreamMetadataFromMetadataArray(stream) || {
      breadcrumb: [],
      metadata: {},
    };
  }

  const metadataUpdated = {
    ...metadata,
    metadata: {
      ...metadata?.metadata,
      ...payload,
    },
  };

  if (index >= 0) {
    stream.metadata[index] = metadataUpdated;
  } else {
    stream.metadata.push(metadataUpdated);
  }

  return stream;
}

export function isStreamSelected(stream: StreamType) {
  const {
    metadata,
  } = stream || {};

  return metadata?.find(isMetadataForStreamFromMetadataArray)?.metadata?.selected;
}

export function getSelectedStreams(block: BlockType, opts?: {
  getAll?: boolean;
}): StreamType[] {
  const {
    getAll,
  } = opts || {};

  const catalog = block?.catalog;

  const arr = catalog?.streams || [];

  if (getAll) {
    return arr;
  }

  return arr?.filter(isStreamSelected);
}

export function mergeSchemaProperties(
  streamChild: StreamType,
  streamOverride: StreamType,
): StreamDifferencesType {
  const newColumnSettings = {};
  const newColumns = [];
  const newProperties = {};

  function updateNewColumnSettings(column, data) {
    if (!newColumnSettings?.[column]) {
      newColumnSettings[column] = {};
    }

    newColumnSettings[column] = {
      ...newColumnSettings?.[column],
      ...data,
    };
  }

  // Add new columns from stream child.
  // For existing columns, update the property type.

  const p1 = streamChild?.schema?.properties || {};
  const p2 = streamOverride?.schema?.properties || {};

  Object.entries(p1).forEach(([column, settings1]) => {
    const settings2 = p2?.[column];

    // Existing column
    if (settings2) {
      let t1 = settings1?.type || [];
      t1 = Array.isArray(t1) ? t1 : [t1];
      let t2 = settings2?.type || [];
      t2 = Array.isArray(t2) ? t2 : [t2];
      if (!equals(t1, t2)) {
        updateNewColumnSettings(column, {
          type: t1,
        });
      }

      const f1 = settings1?.format;
      const f2 = settings2?.format;
      if (f1 !== f2) {
        updateNewColumnSettings(column, {
          format: f1,
        });
      }

      const a1 = settings1?.anyOf || {};
      const a2 = settings2?.anyOf || {};
      if (!isEqual(a1, a2)) {
        updateNewColumnSettings(column, {
          anyOf: a1,
        });
      }

      if (newColumnSettings?.[column]) {
        newProperties[column] = settings1;
      }
    } else {
      // New column
      newColumns.push(column);
      newProperties[column] = settings1;
    }
  });

  return {
    newColumnSettings,
    newColumns,
    stream: {
      ...streamOverride,
      schema: {
        ...streamOverride?.schema,
        properties: {
          ...p2,
          ...newProperties,
          ...newColumnSettings,
        },
      },
    },
  };
}

export function buildStreamMapping(streamsArr: StreamType[], existingMapping?: StreamMapping): StreamMapping {
  const {
    noParents: noParentsExisting,
    parents: parentsExisting,
  } = existingMapping || {};
  const mapping = {
    noParents: {},
    parents: {},
  };

  streamsArr?.forEach((stream: StreamType) => {
    const parentStream = stream?.parent_stream;
    const id = getStreamID(stream);
    if (parentStream) {
      if (!parentsExisting?.[parentStream]?.[id]) {
        if (!mapping.parents[parentStream]) {
          mapping.parents[parentStream] = {};
        }

        mapping.parents[parentStream][id] = stream;
      }
    } else {
      if (!noParentsExisting?.[id]) {
        mapping.noParents[id] = stream;
      }
    }
  });

  return mapping;
}

export function getAllStreamsFromStreamMapping(streamMapping: StreamMapping): StreamType[] {
  const {
    noParents = {},
    parents = {},
  } = streamMapping || {};
  return Object.values(noParents || []).concat(
    Object.values(parents || []).reduce((acc, mapping) => acc.concat(Object.values(mapping)), []),
  );
}

export function getStreamFromStreamMapping(stream: StreamType, mapping: StreamMapping): StreamType {
  const parentStream = stream?.parent_stream;
  const id = getStreamID(stream);

  if (parentStream) {
    return mapping?.parents?.[parentStream]?.[id];
  }

  return mapping?.noParents?.[id];
}

export function isStreamInMappings(
  stream: StreamType,
  mapping1: StreamMapping,
  mapping2: StreamMapping,
): boolean {
  return !!getStreamFromStreamMapping(stream, mapping1)
    && !!getStreamFromStreamMapping(stream, mapping2);
}

export function getDifferencesBetweenStreams(
  stream: StreamType,
  mapping1: StreamMapping,
  mapping2: StreamMapping,
): StreamDifferencesType {
  const s1 = getStreamFromStreamMapping(stream, mapping1);
  const s2 = getStreamFromStreamMapping(stream, mapping2);

  const diffs = mergeSchemaProperties(s1, s2);
  const {
    newColumnSettings,
    newColumns,
  } = diffs || {};

  if (!isEmptyObject(newColumnSettings || {}) || newColumns?.length >= 1) {
    return diffs;
  }
}

export function noStreamsAnywhere(
  mapping1: StreamMapping,
  mapping2: StreamMapping,
): boolean {
  return [
    ...Object.values(mapping1 || {}),
    ...Object.values(mapping2 || {}),
  ].every(mapping => isEmptyObject(mapping));
}

export function getSchemaPropertiesWithMetadata(stream: StreamType): {
  [column: string]: SchemaPropertyType;
} {
  const schemaProperties = {
    ...(stream?.schema?.properties || {}),
  };

  stream?.metadata?.forEach((metadata: MetadataType) => {
    if (!isMetadataForStreamFromMetadataArray(metadata)) {

      const column = metadata?.breadcrumb?.find(key => key !== BreadcrumbEnum.PROPERTIES);
      if (column && schemaProperties?.[column]) {
        schemaProperties[column] = {
          ...schemaProperties[column],
          metadata,
        };
      }
    }
  });

  return schemaProperties;
}

export function getStreamMetadataByColumn(stream: StreamType): {
  [column: string]: MetadataType;
} {
  return stream?.metadata?.reduce((acc, metadata: MetadataType) => {
    if (isMetadataForStreamFromMetadataArray(metadata)) {
      return acc;
    }

    const column = getColumnFromMetadata(metadata);
    if (column) {
      acc[column] = metadata;
    }

    return acc;
  }, {});
}

export function getColumnFromMetadata(metadata: MetadataType): string {
  return metadata?.breadcrumb?.find(key => key !== BreadcrumbEnum.PROPERTIES);
}

export function buildMetadataForColumn(column: string): MetadataType {
  return {
    breadcrumb: [
      BreadcrumbEnum.PROPERTIES,
      column,
    ],
    metadata: {
      inclusion: InclusionEnum.AVAILABLE,
      selected: true,
    },
  };
}

export function updateStreamPropertiesForColumns(stream: StreamType, properties: {
  [column: string]: SchemaPropertyType;
}) {
  return {
    ...stream,
    schema: {
      ...stream?.schema,
      properties: {
        ...stream?.schema?.properties,
        ...properties,
      },
    },
  };
}

export function updateStreamMetadataForColumns(stream: StreamType, metadataByColumn: {
  [column: string]: MetadataType;
}): StreamType {
  const metadataForStream: MetadataType = getStreamMetadataFromMetadataArray(stream);
  const streamMetadataByColumn = getStreamMetadataByColumn(stream);

  const metadataByColumnUpdated = {
    ...streamMetadataByColumn,
    ...metadataByColumn,
  };

  return {
    ...stream,
    metadata: [
      metadataForStream,
      ...Object.values(metadataByColumnUpdated || {}),
    ],
  };
}

export function addTypesToProperty(
  typesDerivedToAdd: string[],
  property: PropertyColumnMoreType,
) {
  const {
    type: types = [],
    typesDerived: typesDerived1,
  } = property || {};
  const property2 = {
    ...property,
  };
  const typesArr = !Array.isArray(types) ? [types] : types;
  const types2 = [...typesArr];
  const typesDerived2 = [...typesDerived1];

  typesDerivedToAdd?.forEach((td) => {
    if (COLUMN_TYPE_CUSTOM_DATE_TIME === td) {
      property2.format = ColumnFormatEnum.DATE_TIME;
    } else if (ColumnFormatEnum.UUID === td) {
      property2.format = ColumnFormatEnum.UUID;
    } else {
      if (!types2?.includes(td)) {
        types2.push(td);
      }
      if (!typesDerived2?.includes(td)) {
        typesDerived2.push(td);
      }
    }
  });

  return {
    ...property2,
    type: types2,
    typesDerived: typesDerived2,
  };
}

export function removeTypesFromProperty(
  typesDerivedToRemove: string[],
  property: PropertyColumnMoreType,
) {
  const {
    format,
    type: types = [],
    typesDerived: typesDerived1,
  } = property || {};
  const property2 = {
    ...property,
  };

  const typesArr = !Array.isArray(types) ? [types] : types;
  let types2 = [...typesArr];
  let typesDerived2 = [...typesDerived1];

  typesDerivedToRemove?.forEach((td) => {
    if (format && ColumnFormatMapping[format] === td) {
      delete property2.format;
    } else {
      if (types2?.includes(td)) {
        types2 = [...types2?.filter(i => i !== td)];
      }
      if (typesDerived2?.includes(td)) {
        typesDerived2 = [...typesDerived2?.filter(i => i !== td)];
      }
    }
  });

  return {
    ...property2,
    type: types2,
    typesDerived: typesDerived2,
  };
}

export function hydrateProperty(
  uuid: string,
  property: SchemaPropertyType,
): PropertyColumnMoreType {
  const {
    format,
    type: types = [],
  } = property || {};

  let typesArr = types;
  if (!Array.isArray(types)) {
    if (!types) {
      typesArr = [];
    } else {
      typesArr = [types];
    }
  }
  const typesDerived = typesArr?.filter(i => ![
    COLUMN_TYPE_CUSTOM_DATE_TIME,
    ColumnFormatEnum.UUID,
  ]?.includes(i));

  if (ColumnFormatMapping[format]) {
    if (!typesDerived?.includes(ColumnFormatMapping[format])) {
      typesDerived.push(ColumnFormatMapping[format]);
    }
  }

  return {
    ...property,
    typesDerived,
    uuid,
  };
}

export function groupStreamsForTables(streamMapping: StreamMapping): {
  groupHeader: string;
  streams: StreamType[];
}[] {
  const {
    noParents,
    parents,
  } = streamMapping || {};

  return [
    {
      groupHeader: null,
      streams: sortByKey(Object.values(noParents), (stream: StreamType) => getStreamID(stream)),
    },
    ...sortByKey(Object.entries(parents), ([parentStreamID]) => parentStreamID).map(([
      groupHeader,
      mapping,
    ]) => ({
      groupHeader,
      streams: sortByKey(Object.values(mapping), (stream: StreamType) => getStreamID(stream)),
    })),
  ];
}

export function updateStreamInStreamMapping(
  stream: StreamType,
  streamMapping: StreamMapping,
  opts?: {
    remove?: boolean;
  },
): StreamMapping {
  const { remove } = opts || {};

  const id = getStreamID(stream || {});
  const idParent = getParentStreamID(stream || {});

  const mapping = {
    ...streamMapping,
  };

  if (idParent) {
    if (remove) {
      delete mapping?.parents?.[idParent]?.[id];
    } else {
      mapping.parents = {
        ...mapping?.parents,
        [idParent]: {
          ...mapping?.parents?.[idParent],
          [id]: stream,
        },
      };
    }
  } else if (id) {
    if (remove) {
      delete mapping?.noParents?.[id];
    } else {
      mapping.noParents = {
        ...mapping?.noParents,
        [id]: stream,
      };
    }
  }

  return mapping;
}

export function updateStreamMappingWithStreamAttributes(
  streamMapping: StreamMapping,
  attributesMapping: AttributesMappingType,
): StreamMapping {
  const attributesOnStream = [
    AttributeUUIDEnum.AUTO_ADD_NEW_FIELDS,
    AttributeUUIDEnum.DISABLE_COLUMN_TYPE_CHECK,
    AttributeUUIDEnum.REPLICATION_METHOD,
    AttributeUUIDEnum.RUN_IN_PARALLEL,
    AttributeUUIDEnum.UNIQUE_CONFLICT_METHOD,
  ];

  const selectedAttributesWithValues = Object
    .entries(attributesMapping || {})
    .reduce((acc, [attribute, { selected, value }]) => ({
      ...acc,
      ...(selected ? { [attribute]: value } : {}),
    }), {});

  const updateStreamColumnsWithAttributeValues = (
    stream: StreamType,
  ): StreamType => {
    const streamUpdated = { ...stream };
    const schemaProperties = streamUpdated?.schema?.properties || {};

    Object.entries(selectedAttributesWithValues || {}).forEach(([attribute, value]) => {
      if (attributesOnStream.includes(attribute as AttributeUUIDEnum)) {
        streamUpdated[attribute] = value;
      }
    });

    return streamUpdated;
  };

  let streamMappingUpdated = {
    ...streamMapping,
  };
  const streams: StreamType[] = streamMapping
    ? (getAllStreamsFromStreamMapping(streamMapping) || [])
    : [];

  streams?.forEach((stream: StreamType) => {
    streamMappingUpdated = updateStreamInStreamMapping(
      updateStreamColumnsWithAttributeValues(stream),
      streamMappingUpdated,
    );
  });

  return streamMappingUpdated;
}

export function updateStreamMappingWithPropertyAttributeValues(
  streamMapping: StreamMapping,
  highlightedColumnsMapping: ColumnsMappingType,
  attributesMapping: AttributesMappingType,
): StreamMapping {
  const attributesOnStream = [
    AttributeUUIDEnum.BOOKMARK_PROPERTIES,
    AttributeUUIDEnum.KEY_PROPERTIES,
    AttributeUUIDEnum.PARTITION_KEYS,
    AttributeUUIDEnum.UNIQUE_CONSTRAINTS,
  ];

  const columnsHighlighted: string[] = Object
    .entries(highlightedColumnsMapping || {})
    .reduce((acc, [column, highlighted]) => highlighted ? acc.concat(column) : acc, []);
  const selectedAttributesWithValues = Object
    .entries(attributesMapping || {})
    .reduce((acc, [attribute, { selected, value }]) => ({
      ...acc,
      ...(selected ? { [attribute]: value } : {}),
    }), {});

  const updateStreamColumnsWithAttributeValues = (
    stream: StreamType,
  ): StreamType => {
    const streamUpdated = { ...stream };
    const schemaProperties = streamUpdated?.schema?.properties || {};
    const metadataByColumn: {
      [column: string]: MetadataType;
    } = getStreamMetadataByColumn(stream);

    columnsHighlighted?.forEach((column: string) => {
      if (schemaProperties?.[column]) {
        Object.entries(selectedAttributesWithValues || {}).forEach(([
          attribute,
          value,
        ]) => {
          if (AttributeUUIDEnum.PROPERTY_SELECTED === attribute) {
            const metadataForColumn =
              metadataByColumn?.[column] || buildMetadataForColumn(column) || {
                breadcrumb: [],
                metadata: {},
              };

            const md = {
              ...metadataForColumn,
              metadata: {
                ...metadataForColumn?.metadata,
                selected: value as boolean,
              },
            };

            metadataByColumn[column] = md;
          } else if (attributesOnStream.includes(attribute as AttributeUUIDEnum)) {
            if (!streamUpdated?.[attribute]) {
              streamUpdated[attribute] = [];
            }

            const columnIsInAttribute = streamUpdated[attribute]?.includes(column);

            // Add the column if it’s not already there.
            if (value && !columnIsInAttribute) {
              streamUpdated[attribute].push(column);
            } else if (!value && columnIsInAttribute) {
              // Remove the column if it’s already there.
              streamUpdated[attribute] = remove(streamUpdated[attribute], i => i === column);
            }
          } else if (COLUMN_TYPES.includes(attribute)) {
            const propertyForColumn = {
              ...(schemaProperties?.[column] || {}),
            };
            const p1 = hydrateProperty(column, propertyForColumn);

            const mutateFunc = value ? addTypesToProperty : removeTypesFromProperty;

            const {
              anyOf,
              format,
              type,
            } = mutateFunc([attribute], p1);

            if (!streamUpdated?.schema) {
              streamUpdated.schema = {
                properties: {},
              };
            }

            if (!streamUpdated?.schema?.properties) {
              streamUpdated.schema = {
                ...streamUpdated?.schema,
                properties: {},
              };
            }

            const p2 = selectEntriesWithValues({
              anyOf,
              format,
              type,
            });
            streamUpdated.schema.properties[column] = p2;
          }
        });
      }
    });

    return updateStreamMetadataForColumns(streamUpdated, metadataByColumn);
  };

  let streamMappingUpdated = {
    ...streamMapping,
  };
  const streams: StreamType[] = streamMapping
    ? (getAllStreamsFromStreamMapping(streamMapping) || [])
    : [];

  streams?.forEach((stream: StreamType) => {
    streamMappingUpdated = updateStreamInStreamMapping(
      updateStreamColumnsWithAttributeValues(stream),
      streamMappingUpdated,
    );
  });

  return streamMappingUpdated;
}

export function getSelectedPropertiesByPropertyUUID(stream: StreamType): {
  [uuid: string]: PropertyColumnWithUUIDType[];
} {
  const schemaProperties = stream?.schema?.properties || {};

  return stream?.metadata?.reduce((acc, metadata: MetadataType) => {
    if (isMetadataForStreamFromMetadataArray(metadata)) {
      return acc;
    }

    const isSelected = metadata?.metadata?.selected;

    if (!isSelected) {
      return acc;
    }

    const uuid = getColumnFromMetadata(metadata);
    const property = schemaProperties?.[uuid];

    return {
      ...acc,
      [uuid]: {
        ...property,
        metadata,
        uuid,
      },
    };
  }, {});
}

export function buildInputsFromUpstreamBlocks(
  blockUpstreamBlocks: BlockType[],
  dataIntegrationConfiguration: ConfigurationDataIntegrationType,
) {
  const inputs = dataIntegrationConfiguration?.inputs || {};

  return blockUpstreamBlocks?.reduce((acc, b) => {
    const uuid = b?.uuid;
    const input = uuid && inputs?.[uuid];
    if (!input) {
      return acc;
    }

    return acc.concat({
      block: b,
      input,
    });
  }, []);
}

export function getSelectedColumnsAndAllColumn(stream: StreamType): {
  allColumns: {
    [uuid: string]: PropertyColumnWithUUIDType[];
  };
  selectedColumns: {
    [uuid: string]: PropertyColumnWithUUIDType[];
  };
} {
  const allColumns = {};
  const selectedColumns = {};

  const selectedByColumns = {};

  stream?.metadata?.forEach((metadata: MetadataType) => {
    if (!isMetadataForStreamFromMetadataArray(metadata)) {
      const column = getColumnFromMetadata(metadata);
      if (column && metadata?.metadata) {
        selectedByColumns[column] = metadata?.metadata?.selected;
      }
    }
  });

  Object.entries(stream?.schema?.properties || {}).forEach(([
    column,
    property,
  ]) => {
    const propertyWithUUID: PropertyColumnWithUUIDType = {
      ...property,
      uuid: column,
    };

    if (column in selectedByColumns)  {
      if (selectedByColumns?.[column]) {
        selectedColumns[column] = propertyWithUUID;
      }
    } else {
      selectedColumns[column] = propertyWithUUID;
    }
    allColumns[column] = propertyWithUUID;
  });

  return {
    allColumns,
    selectedColumns,
  };
}

export function isDynamic(block: BlockType): boolean {
  const {
    configuration,
    tags,
  } = block || {};

  return configuration?.dynamic || tags?.includes(TagEnum.DYNAMIC);
}

export function isDynamicChild(block: BlockType): boolean {
  const {
    tags,
  } = block || {};

  return tags?.includes(TagEnum.DYNAMIC_CHILD);
}

export function isDynamicOrDynamicChild(block: BlockType): boolean {
  return isDynamic(block) || isDynamicChild(block);
}

export function reduceOutput(block: BlockType): boolean {
  const {
    configuration,
    tags,
  } = block || {};

  return configuration?.reduce_output || tags?.includes(TagEnum.REDUCE_OUTPUT);
}
