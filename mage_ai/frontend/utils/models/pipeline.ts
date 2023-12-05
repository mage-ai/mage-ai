import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import { ReplicationMethodEnum, StreamType } from '@interfaces/IntegrationSourceType';

export function blocksWithStreamsWithIncrementalReplicationMethod(pipeline: PipelineType): {
  [uuid: string]: {
    block: BlockType;
    streams: StreamType[];
  };
} {
  const streamsByBlockUUID = {};

  pipeline?.blocks?.forEach((block) => {
    const {
      catalog,
      type,
      uuid,
    } = block;

    if (BlockTypeEnum.DATA_LOADER === type && catalog?.streams) {
      const streams = catalog?.streams?.filter(({
        replication_method: replicationMethod,
      }) => ReplicationMethodEnum.INCREMENTAL === replicationMethod);

      if (streams?.length >= 1) {
        if (!(uuid in streamsByBlockUUID)) {
          streamsByBlockUUID[uuid] = {
            block,
            streams: [],
          };
        }

        streamsByBlockUUID[uuid].streams.push(streams);
      }
    }
  });

  return streamsByBlockUUID;
}
