import { DragItem, NodeType } from '../../../Canvas/interfaces';
import { ItemTypeEnum } from '../../../Canvas/types';
import { isDebug } from '@utils/environment';
import { buildUUIDForLevel } from './levels';

export function buildNodeGroups(items: DragItem[]): [NodeType[], DragItem[]] {
  const itemsUngrouped = [];
  const groups = {};
  const itemsToGroups = {};

  items?.forEach((item: DragItem) => {
    if (item?.block?.groups) {
      item?.block?.groups?.forEach((groupIDBase: string) => {
        const groupID = buildUUIDForLevel(groupIDBase, item?.level ?? 0);

        itemsToGroups[item.id] = groupID;

        groups[groupID] ||= {
          id: groupID,
          items: [],
          level: item?.level,
          type: ItemTypeEnum.NODE,
          upstreamNodes: [],
        };
        groups[groupID].items.push(item);

        (item?.block?.upstream_blocks ?? [])?.forEach((nodeID: string) => {
          if (!(groups[groupID].upstreamNodes ?? []).find((node: NodeType) => node.id === nodeID)) {

            groups[groupID].upstreamNodes.push({
              id: nodeID,
              level: item?.level,
              type: ItemTypeEnum.NODE,
            });
          }
        });
      });
    } else {
      itemsUngrouped.push(item);
    }
  });

  Object.entries(groups || {})?.forEach(([groupID, group]: [string, NodeType]) => {
    const arr = [];
    group?.upstreamNodes?.forEach((node: NodeType) => {
      if (node?.id in itemsToGroups) {
        const groupID2 = itemsToGroups?.[node?.id];
        if (groupID !== groupID2) {
          arr.push({
            id: groupID2,
            level: group?.level,
            type: ItemTypeEnum.NODE,
          });
        }
      }
    });
    groups[groupID].upstreamNodes = arr;
  });

  if (isDebug()) {
    Object.entries(groups || {})?.forEach(([id, group]: [string, NodeType]) => {
      const map = {
        export: ['transform'],
        index: ['export'],
        load: [],
        query_processing: [''],
        response_generation: ['retrieval'],
        retrieval: ['query_processing'],
        transform: ['load'],
      };

      if (id in map){
        const upstreamNodes = group?.upstreamNodes;
        const value = map[id];
        if (value?.join(',') !== upstreamNodes?.map((node: NodeType) => String(node.id))?.join(',')) {
          console.error(
            `Group ${id} is missing upstream node ${value}: ${upstreamNodes}`,
            group,
            groups,
          );
        }
      }
    });

    false &&
      isDebug() && console.log('Groups with upstream nodes:', groups);
  }

  return [Object.values(groups), itemsUngrouped];
}
