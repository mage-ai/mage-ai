import BlockType from '@interfaces/BlockType';
import { FrameworkType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { PipelineExecutionFrameworkUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { hyphensToSnake, snakeToHyphens, parseDynamicUrl } from '@utils/url';

export function getGroupsFromPath(pathname: string, framework: { uuid: PipelineExecutionFrameworkUUIDEnum }, groupsByLevel: FrameworkType[][]): BlockType[] {
  const { slug } = parseDynamicUrl(pathname, '/v2/pipelines/[uuid]/[...slug]');
  const uuids = (Array.isArray(slug) ? slug : [slug])?.map(
    path => hyphensToSnake(path))?.filter(pk => pk !== framework?.uuid);

  const groupsArg = uuids.reduce((acc, uuid: string, idx: number) => {
    const group = groupsByLevel?.[idx]?.find(g => g.uuid === uuid);
    return acc.concat(group);
  }, []);
  const missing = groupsArg.findIndex(g => !(g ?? false));
  if (missing >= 0) {
    groupsArg.splice(missing);
  }

  return groupsArg;
}

export function buildNewPathsFromBlock(block: BlockType, groupMapping: Record<string, FrameworkType>): string[] {
  const groupsNext = [block];

  let groupUUIDs = groupsNext[0]?.groups ?? [];
  while (groupUUIDs.length > 0) {
    const gup = groupUUIDs.map(guuid => groupMapping?.[guuid])?.[0];
    if (gup) {
      groupsNext.unshift(gup);
      groupUUIDs = gup?.groups ?? [];
    } else {
      groupUUIDs = [];
    }
  }

  const uuidsNext = groupsNext.map(g => snakeToHyphens(g.uuid));

  return uuidsNext;
}
