import { useMemo } from 'react';

import BlockType, { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import { SchemaPropertyType, StreamType } from '@interfaces/IntegrationSourceType';
import { equals, indexBy } from '@utils/array';
import { isEmptyObject, isEqual } from '@utils/hash';

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

function getUpstreamDynamicAndReduceOuput(block: BlockType, blocks: BlockType[]): {
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
    } = getUpstreamDynamicAndReduceOuput(block, blocks);

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

export function getStreamMetadata(stream: StreamType): StreamType {
  return stream?.metadata?.find(({
    breadcrumb,
  }) => breadcrumb?.length === 0) || {};
}

export function updateStreamMetadata(streamInit: StreamType, payload): StreamType {
  const stream = { ...streamInit };
  if (!stream?.metadata) {
    stream.metadata = [];
  }

  const index = stream?.metadata?.findIndex(({ breadcrumb }) => breadcrumb?.length === 0);

  let metadata = {
    breadcrumb: [],
  };
  if (index >= 0) {
    metadata = getStreamMetadata(stream) || {};
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

  return metadata?.find(({ breadcrumb }) => breadcrumb?.length === 0)?.metadata?.selected;
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
      newColumnSettings[column] = {}
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
      const t1 = settings1?.type || [];
      const t2 = settings2?.type || [];
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
          ...newColumnSettings,
        },
      },
    },
  };
}

export function buildStreamMapping(streamsArr: StreamType[], existingMapping?: StreamMapping) {
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
