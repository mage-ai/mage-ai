import { DragItem, NodeType } from '../../../Canvas/interfaces';
import { ItemTypeEnum } from '../../../Canvas/types';

export function buildNodeGroups(items: DragItem[]): [NodeType[], DragItem[]] {
  const itemsUngrouped = [];
  const groups = {};

  items?.forEach((item: DragItem) => {
    if (item?.block?.groups) {
      item?.block?.groups?.forEach((groupID: string) => {
        groups[groupID] ||= {
          id: groupID,
          items: [],
          type: ItemTypeEnum.NODE,
          upstreamNodes: [],
        };
        groups[groupID].items.push(item);

        (item?.block?.upstream_blocks ?? [])?.forEach((nodeID: string) => {
          if (!(groups[groupID].upstreamNodes ?? []).find((node: NodeType) => node.id === nodeID)) {
            groups[groupID].upstreamNodes.push({
              id: nodeID,
              type: ItemTypeEnum.NODE,
            });
          }
        });
      });
    } else {
      itemsUngrouped.push(item);
    }
  });

  return [Object.values(groups), itemsUngrouped];
}
