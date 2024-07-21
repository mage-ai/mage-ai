import { BatchPipeline, PipelineV3, BlockGenericV2Partial } from '@mana/icons';
import { MenuItemType } from '@mana/components/Menu/interfaces';
import { buildDependencies } from '../../../Apps/PipelineCanvas/utils/pipelines';
import { deepCopy } from '@utils/hash';
import PipelineExecutionFrameworkType, {
  FrameworkType,
  PipelineExecutionFrameworkBlockType,
} from '@interfaces/PipelineExecutionFramework/interfaces';

type Block = FrameworkType & PipelineExecutionFrameworkBlockType;

function menuItemsForBlock(
  block: Block,
  level: number,
  index: number,
  parent: MenuItemType,
) {
  const parent2 = {
    ...block,
    index,
    label: block.name ?? block.uuid,
    level,
    parent,
  };

  const items =
    (block as any)?.children?.map((block1: Block, index1: number) => menuItemsForBlock(
      block1, level + 1, index1, deepCopy(parent2)
    ));

  return {
    ...parent2,
    items,
  };
}

export function buildIntraAppNavItems({
  framework,
}: {
  framework: PipelineExecutionFrameworkType;
}) {
  const menuItems: MenuItemType[] = [];
  const { groupsByLevel } = buildDependencies(framework);

  (groupsByLevel as MenuItemType[][]).forEach((groups: MenuItemType[], level: number) => {
    const parent = {
      Icon: level === 0 ? PipelineV3 : level === 1 ? BatchPipeline : BlockGenericV2Partial,
      label: level === 0 ? `${framework.name} pipelines` : level === 1 ? 'Stages' : 'Operations',
      uuid: framework.uuid,
    };
    const items = groups.map((group: MenuItemType, index: number) => menuItemsForBlock(
      group, level, index, deepCopy(parent),
    )) as MenuItemType[];

    menuItems.push({
      ...parent,
      items,
    });
  });

  return menuItems
}
