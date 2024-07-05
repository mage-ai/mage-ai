import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { LayoutConfigType, NodeItemType } from '../../../Canvas/interfaces';

export function filterDisplayableNodes(nodes: NodeItemType[], opts?: {
  selectedGroup?: MenuGroupType;
  layoutConfig?: LayoutConfigType;
  level?: number;
}): NodeItemType[] {
  const { selectedGroup, level, layoutConfig } = opts;
  console.log('WTFFFFFFFFFFFFFFFFFFFFFFFf',
    nodes?.length,
    nodes,
    opts,
  )
  const nodesFiltered = nodes.filter((node) => {
    const { block } = node;

    if ((selectedGroup ?? false) && selectedGroup?.uuid) {
      return node?.level === selectedGroup?.level + 1
        && (block as { groups: string[] })?.groups?.includes(selectedGroup?.uuid);
    }

    return true;
  });

  console.log('WTFFFFFFFFFFFFFFFFFFFFFFFf000000000', nodesFiltered?.length)

  return nodesFiltered;
}
