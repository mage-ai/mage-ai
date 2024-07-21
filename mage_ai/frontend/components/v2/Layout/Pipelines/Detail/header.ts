import { BatchPipeline, PipelineV3, BlockGenericV2Partial } from '@mana/icons';
import { PipelineExecutionFrameworkUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { hyphensToSnake, snakeToHyphens, parseDynamicUrl } from '@utils/url';
import { buildNewPathsFromBlock, getGroupsFromPath } from '@components/v2/Apps/utils/routing';
import { MenuItemType } from '@mana/components/Menu/interfaces';
import { buildDependencies } from '../../../Apps/PipelineCanvas/utils/pipelines';
import { deepCopy } from '@utils/hash';
import PipelineExecutionFrameworkType, {
  FrameworkType,
  PipelineExecutionFrameworkBlockType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import { cleanName } from '@utils/string';

type Block = FrameworkType & PipelineExecutionFrameworkBlockType;

function menuItemsForBlock(
  block: Block,
  level: number,
  index: number,
  parent: MenuItemType,
  opts: { router: any },
) {
  const { router } = opts ?? {};
  const groupMapping = {};

  let groupup = parent;
  while (groupup) {
    groupMapping[groupup.uuid] = groupup;
    groupup = groupup?.parent;
  }

  const parent2 = {
    ...block,
    index,
    label: block.name ?? block.uuid,
    level,
    onClick: (event: any) => {
      const uuidsNext = buildNewPathsFromBlock(block, groupMapping);

      const { uuid } = router?.query ?? {};
      router.replace(
        {
          pathname: '/v2/pipelines/[uuid]/[...slug]',
          query: {
            slug: [snakeToHyphens(PipelineExecutionFrameworkUUIDEnum.RAG)].concat(uuidsNext).filter(Boolean),
            uuid,
          },
        },
        `/v2/pipelines/${uuid}/${PipelineExecutionFrameworkUUIDEnum.RAG}/${uuidsNext.join('/')}`,
      );
    },
    parent,
  };

  const items =
    (block as any)?.children?.map((block1: Block, index1: number) => menuItemsForBlock(
      block1, level + 1, index1, deepCopy(parent2), opts,
    ));

  return {
    ...parent2,
    items,
  };
}

export function buildIntraAppNavItems({
  framework,
  router,
}: {
  framework: PipelineExecutionFrameworkType;
  router: any;
}) {
  const menuItems: MenuItemType[] = [];
  const { groupsByLevel } = buildDependencies(framework);

  (groupsByLevel as MenuItemType[][]).forEach((groups: MenuItemType[], level: number) => {
    const label = level === 0
      ? `${framework.name} pipelines`
      : level === 1 ? 'Stages' : 'Operations';
    const parent = {
      Icon: level === 0 ? PipelineV3 : level === 1 ? BatchPipeline : BlockGenericV2Partial,
      label,
      uuid: cleanName(label),
    };
    const items = groups.map((group: MenuItemType, index: number) => menuItemsForBlock(
      group, level, index, deepCopy(parent), { router },
    )) as MenuItemType[];

    menuItems.push({
      ...parent,
      items,
    });
  });

  return menuItems
}
