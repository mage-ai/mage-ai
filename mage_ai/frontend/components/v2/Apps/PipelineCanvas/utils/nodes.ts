import { DragItem, NodeType, NodeItemMappingType, ItemMappingType } from '../../../Canvas/interfaces';
import { ItemTypeEnum } from '../../../Canvas/types';
import { isDebug } from '@utils/environment';
import { buildUUIDForLevel } from './levels';

export function updateNodeGroupsWithItems(
  nodeItemMapping: NodeItemMappingType,
  itemMapping: ItemMappingType,
): NodeItemMappingType {
  false &&
  isDebug() && console.log(
    'updateNodeGroupsWithItems',
    'nodeItemMapping', nodeItemMapping,
    'itemMapping', itemMapping,
  );

  const mapping = Object.entries(nodeItemMapping ?? {})?.reduce((
    acc,
    [nodeID, nodeItem]: [string, NodeType],
  ) =>  {
    const items = nodeItem?.items?.map((item: DragItem) => itemMapping?.[item?.id]);

    return {
      ...acc,
      [nodeID]: {
        ...nodeItem,
        items,
      },
    };
  }, {} as NodeItemMappingType);

  return Object.entries(mapping ?? {})?.reduce((
    acc,
    [nodeID, nodeItem]: [string, NodeType],
  ) =>  ({
      ...acc,
      [nodeID]: {
        ...nodeItem,
        upstreamNodes: nodeItem?.upstreamNodes?.map((node: NodeType) => mapping?.[node?.id]),
      },
    }), {} as NodeItemMappingType);
}

// function buildNodeGroups(items: DragItem[]): [NodeType[], DragItem[]] {
//   const itemsUngrouped = [];
//   const groups = {};
//   const itemsToGroups = {};

//   items?.forEach((item: DragItem) => {
//     if (item?.block?.groups) {
//       item?.block?.groups?.forEach((groupIDBase: string) => {
//         const groupID = buildUUIDForLevel(groupIDBase, item?.level ?? 0);

//         itemsToGroups[item.id] = groupID;

//         groups[groupID] ||= {
//           id: groupID,
//           items: [],
//           level: item?.level,
//           type: ItemTypeEnum.NODE,
//           upstreamNodes: [],
//         };
//         groups[groupID].items.push(item);

//         (item?.block?.upstream_blocks ?? [])?.forEach((nodeID: string) => {
//           if (!(groups[groupID].upstreamNodes ?? []).find((node: NodeType) => node.id === nodeID)) {

//             groups[groupID].upstreamNodes.push({
//               id: nodeID,
//               level: item?.level,
//               type: ItemTypeEnum.NODE,
//             });
//           }
//         });
//       });
//     } else {
//       itemsUngrouped.push(item);
//     }
//   });

//   Object.entries(groups || {})?.forEach(([groupID, group]: [string, NodeType]) => {
//     const arr = [];
//     group?.upstreamNodes?.forEach((node: NodeType) => {
//       if (node?.id in itemsToGroups) {
//         const groupID2 = itemsToGroups?.[node?.id];
//         if (groupID !== groupID2) {
//           arr.push({
//             id: groupID2,
//             level: group?.level,
//             type: ItemTypeEnum.NODE,
//           });
//         }
//       }
//     });
//     groups[groupID].upstreamNodes = arr;
//   });

//   if (isDebug()) {
//     Object.entries(groups || {})?.forEach(([id, group]: [string, NodeType]) => {
//       const map = {
//         export: ['transform'],
//         index: ['export'],
//         load: [],
//         query_processing: [''],
//         response_generation: ['retrieval'],
//         retrieval: ['query_processing'],
//         transform: ['load'],
//       };

//       if (id in map){
//         const upstreamNodes = group?.upstreamNodes;
//         const value = map[id];
//         if (value?.join(',') !== upstreamNodes?.map((node: NodeType) => String(node.id))?.join(',')) {
//           console.error(
//             `Group ${id} is missing upstream node ${value}: ${upstreamNodes}`,
//             group,
//             groups,
//           );
//         }
//       }
//     });

//     false &&
//       isDebug() && console.log('Groups with upstream nodes:', groups);
//   }

//   return [Object.values(groups), itemsUngrouped];
// }
