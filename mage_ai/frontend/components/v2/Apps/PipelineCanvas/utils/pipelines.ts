import PipelineExecutionFrameworkType, {
  FrameworkType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import {
  BlockMappingType,
  BlocksByGroupType,
  GroupMappingType,
  GroupLevelType,
} from '../../../Canvas/interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { extractNestedBlocks } from '@utils/models/pipeline';
import { indexBy, flattenArray, uniqueArray } from '@utils/array';
import { ignoreKeys, selectKeys } from '@utils/hash';

export function buildDependencies(
  executionFramework: PipelineExecutionFrameworkType,
  pipeline?: PipelineExecutionFrameworkType,
): {
  blockMapping: BlockMappingType;
  blocksByGroup: BlocksByGroupType;
  groupMapping: GroupMappingType;
  groupsByLevel: GroupLevelType;
} {
  // Build group hierarchy from pipeline execution framework’s blocks:
  // 1. Any block with 0 groups
  // 2. Blocks with a group from level 1
  // 3. Blocks with a group from level 2
  // N. Blocks with type === GROUP

  // Setup
  const levels: FrameworkType[][] = [];
  const stack1: PipelineExecutionFrameworkType[][] = [];

  while (stack1.length >= 1 || (executionFramework && levels.length === 0)) {
    const pipesToAddToStack = [];
    const currentGroupInLevel = [];

    // Block type pipeline is a groups of groups.
    // Block type group is a single group for user to add blocks into.

    const initial = levels.length === 0 && stack1.length === 0;
    const pipesInLevel: PipelineExecutionFrameworkType[] = initial
      ? executionFramework?.pipelines ?? []
      : stack1.shift();

    pipesInLevel?.forEach(pipe1 => {
      const dependencies = {};
      pipe1?.blocks?.forEach(({ downstream_blocks: dnb, upstream_blocks: upb, uuid: uuid1 }) => {
        dependencies[uuid1] = {
          dn: [],
          up: [],
        };

        dnb?.forEach((uuid2: GroupUUIDEnum) => {
          dependencies[uuid1].dn.push(uuid2);
          dependencies[uuid2] ||= { dn: [], up: [] };
          dependencies[uuid2].up.push(uuid1);
        });

        upb?.forEach((uuid2: GroupUUIDEnum) => {
          dependencies[uuid1].up.push(uuid2);
          dependencies[uuid2] ||= { dn: [], up: [] };
          dependencies[uuid2].dn.push(uuid1);
        });
      });

      const pipes = pipe1?.pipelines ?? [];
      if (pipes?.length >= 1) {
        pipes.forEach(pipe2 => {
          const { dn, up } = dependencies[pipe2.uuid] || {};

          pipesToAddToStack.push({
            ...pipe2,
            downstream_blocks: uniqueArray(dn),
            groups: uniqueArray([...(pipe2.groups ?? []), ...(pipe1.groups ?? [])]).filter(
              groupID => groupID !== pipe2.uuid,
            ),
            upstream_blocks: uniqueArray(up),
          });
        });
      }

      currentGroupInLevel.push({
        ...pipe1,
        groups: uniqueArray([
          ...(pipe1.groups ?? []),
          ...(initial ? [executionFramework.uuid] : []),
        ]).filter(groupID => groupID !== pipe1.uuid),
      });
    });

    if (pipesToAddToStack?.length >= 1) {
      stack1.push(flattenArray(pipesToAddToStack));
    }

    levels.push(currentGroupInLevel);
  }

  // Update the dependencies of a block to include blocks from other groups.
  const pipesLast = levels[levels.length - 1] ?? [];
  const pipesMapping = indexBy(pipesLast, ({ uuid }) => uuid);
  const blocksLastLevel = [];
  pipesLast?.forEach(pipe => {
    const { downstream_blocks: dn, upstream_blocks: up } = pipe;
    const blocks = pipe?.blocks ?? [];

    if (blocks?.length >= 1) {
      blocks.forEach(block => {
        if (!block?.downstream_blocks && dn?.length >= 1) {
          // If block has no downstream blocks, it can have a downstream to a block in another group.
          dn.forEach(groupUUID => {
            const groupOther = pipesMapping[groupUUID];
            groupOther?.blocks?.forEach((blockOther: FrameworkType) => {
              if (!blockOther?.upstream_blocks) {
                block.downstream_blocks ||= [];
                block.downstream_blocks = uniqueArray([
                  ...block.downstream_blocks,
                  blockOther.uuid,
                ]) as any;
                blockOther.upstream_blocks ||= [];
                blockOther.upstream_blocks = uniqueArray([
                  ...blockOther.upstream_blocks,
                  block.uuid,
                ]) as any;
              }
            });
          });
        } else if (!block?.upstream_blocks) {
          // If block has no upstream blocks, it can have an upstream to a block in another group.
          up.forEach(groupUUID => {
            const groupOther = pipesMapping[groupUUID];
            groupOther?.blocks?.forEach((blockOther: FrameworkType) => {
              if (!blockOther?.downstream_blocks) {
                block.upstream_blocks ||= [];
                block.upstream_blocks = uniqueArray([
                  ...block.upstream_blocks,
                  blockOther.uuid,
                ]) as any;
                blockOther.downstream_blocks ||= [];
                blockOther.downstream_blocks = uniqueArray([
                  ...blockOther.downstream_blocks,
                  block.uuid,
                ]) as any;
              }
            });
          });
        }

        blocksLastLevel.push({
          ...block,
          groups: [pipe.uuid],
        });
      });
    }
  });

  levels.push(blocksLastLevel);

  // Remove unused attributes in the groups
  const groupMapping1 = {} as GroupMappingType;
  const groupsByLevel1 = [];
  levels.forEach(groups => {
    const groupsInLevel = [];

    groups.forEach(group => {
      const group2 = selectKeys(group, [
        'configuration',
        'description',
        'downstream_blocks',
        'groups',
        'name',
        'upstream_blocks',
        'uuid',
      ]);

      groupsInLevel.push(group2);
      groupMapping1[group2.uuid] = group2;
    });

    groupsByLevel1.push(groupsInLevel);
  });

  const groupsByLevel = [];
  groupsByLevel1.reverse().forEach((groups: FrameworkType[], idx: number) => {
    const groupsInLevel = [];

    groups.forEach(group => {
      const group2 = { ...group };

      if (idx >= 1) {
        const groupsInPrevLevel = groupsByLevel[0];
        group2.children = groupsInPrevLevel?.filter?.((groupPrev: FrameworkType) =>
          groupPrev?.groups?.includes(group2.uuid),
        );
      }

      groupsInLevel.push(group2);
    });

    groupsByLevel.unshift(groupsInLevel);
  });
  const groupMapping = indexBy(
    groupsByLevel.flatMap(groups =>
      groups?.map(g => ({
        ...groupMapping1[g.uuid],
        ...g,
      })),
    ),
    g => g.uuid,
  );

  // Get all the blocks from the user’s pipeline
  const pipelinesMapping = indexBy(extractNestedPipelines(pipeline), ({ uuid }) => uuid);
  const blockMapping = extractNestedBlocks(pipeline, pipelinesMapping, {
    addPipelineToBlocks: true,
    excludeBlockTypes: [BlockTypeEnum.PIPELINE],
  });
  const blocksByGroup = blocksToGroupMapping(Object.values(blockMapping));

  // For every block in a group, update the block’s upstream and downstream blocks by:
  // 1. Get the block’s group’s upstream and downstream blocks; the group’s upstream and downstream
  //   blocks will be pointing to another group.
  // 2. Get the group that’s being pointed to.
  // 3. Get the block UUIDs from the pointed group.
  // 4. Add the blocks’ UUID to the current blocks’s upstream and downstream blocks.

  Object.entries(blockMapping ?? {})?.forEach(([blockUUID, block]: [string, BlockType]) => {
    block?.groups?.forEach((groupUUID: GroupUUIDEnum) => {
      const group = groupMapping[groupUUID];

      const dn = group?.downstream_blocks ?? [];
      dn.forEach((groupUUIDdn: GroupUUIDEnum) => {
        const blocksdn = blocksByGroup[groupUUIDdn];
        block.downstream_blocks ||= [];
        block.downstream_blocks = uniqueArray([
          ...block.downstream_blocks,
          ...(blocksdn ? Object.keys(blocksdn) : []),
        ]) as any;
      });

      const up = group?.upstream_blocks ?? [];
      up.forEach((groupUUIDup: GroupUUIDEnum) => {
        const blocksup = blocksByGroup[groupUUIDup];
        block.upstream_blocks ||= [];
        block.upstream_blocks = uniqueArray([
          ...block.upstream_blocks,
          ...(blocksup ? Object.keys(blocksup) : []),
        ]) as any;
      });

      if (block?.pipeline) {
        block.pipeline = ignoreKeys(block.pipeline, ['blocks', 'pipelines']);
      }

      blockMapping[blockUUID] = block;
    });
  });

  // console.log({
  //   blockMapping,
  //   blocksByGroup,
  //   groupMapping,
  //   groupsByLevel,
  // });

  return {
    blockMapping,
    blocksByGroup,
    groupMapping,
    groupsByLevel,
  };
}

function blocksToGroupMapping(blocks: BlockType[]): BlocksByGroupType {
  const mapping = {} as BlocksByGroupType;

  blocks?.forEach((block: BlockType) => {
    block?.groups?.forEach((groupUUID: GroupUUIDEnum) => {
      mapping[groupUUID as GroupUUIDEnum] ||= {} as BlockMappingType;
      mapping[groupUUID as GroupUUIDEnum][block.uuid] = block;
    });
  });

  return mapping as BlocksByGroupType;
}

function extractNestedPipelines(
  pipeline: PipelineExecutionFrameworkType,
): PipelineExecutionFrameworkType[] {
  const pipes = [];

  pipeline?.pipelines?.forEach(pipe => {
    pipes.push(pipe);
    pipes.push(...extractNestedPipelines(pipe));
  });

  return pipes;
}
