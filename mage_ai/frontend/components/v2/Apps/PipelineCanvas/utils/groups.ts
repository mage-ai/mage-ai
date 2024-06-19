import { DragItem, NodeType } from '../../../Canvas/interfaces';

export function buildNodeGroups(items: DragItem[]): [NodeType[], DragItem[]] {
  const ungrouped = [];
  const groups = {};

  items?.forEach((item: DragItem) => {
    if (item?.block?.groups) {
      item?.block?.groups?.forEach((groupID: string) => {
        groups[groupID] ||= {
          id: groupID,
          items: [],
          upstreamNodes: [],
        };
        groups[groupID].items.push(item);

        (item?.block?.upstream_blocks ?? [])?.forEach((nodeID: string) => {
          if (!(groups[groupID].upstreamNodes ?? []).find((node: NodeType) => node.id === nodeID)) {
            groups[groupID].upstreamNodes.push({
              id: nodeID,
            });
          }
        });
      });
    } else {
      ungrouped.push(item);
    }
  });

  return [Object.values(groups), ungrouped];
}
