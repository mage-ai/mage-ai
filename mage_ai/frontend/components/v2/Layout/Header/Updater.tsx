import React, { useEffect } from 'react';
import { BatchPipeline, PipelineV3, BlockGenericV2Partial } from '@mana/icons';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { ItemClickHandler, MenuGroupType, MenuItemType } from '@mana/components/Menu/interfaces';
import { useLayout } from '@context/v2/Layout';

type Block = FrameworkType & PipelineExecutionFrameworkBlockType;

function menuItemsForBlock(
  block: Block,
  onClick: (event: MouseEvent, group: MenuGroupType) => void,
  level: number,
  index: number,
) {
  function convertToItem(
    block1: Block,
    onClick2: (event: MouseEvent, group: MenuGroupType) => void,
    level2: number,
    index2: number,
  ) {
    const {
      description,
      // downstream_blocks,
      name,
      // upstream_blocks,
      uuid,
    } = block1;

    return {
      description,
      items: block1?.children?.map(
        (block2: Block, index3: number) => menuItemsForBlock(block2,
          (event: MouseEvent, item: MenuGroupType) => {
            onClick2(event, {
              ...item,
              groups: (item.groups ?? []).concat({
                ...(block1 as any),
                index: index2,
                level: level2,
              } as MenuGroupType)
            });
          },
          level2 + 1, index3,
        ),
      ),
      label: name || uuid,
      onClick: (event: MouseEvent, item: MenuItemType) => onClick2(event, {
        ...item,
        index: index2,
        level: level2,
      } as MenuGroupType),
      uuid,
    };
  }

  return convertToItem(block, onClick, level, index);
}

export default function HeaderUpdater({
  executionFramework,
  groupsByLevel,
  handleMenuItemClick,
  pipeline,
}: {
  executionFramework: FrameworkType;
  groupsByLevel: MenuItemType[][];
  handleMenuItemClick?: (event: MouseEvent, groups: MenuGroupType[]) => void;
  pipeline: FrameworkType;
}) {
  const { header: { setHeader } } = useLayout();

  useEffect(() => {
    const buildIntraAppNavItems = (onClickBase: ItemClickHandler) => {
      const onClick = (event: MouseEvent, item: MenuGroupType) => {
        onClickBase(event, item, handleMenuItemClick);
      };
      const menuItems: MenuItemType[] = [];
      const fname = executionFramework?.name ?? executionFramework?.uuid;

      (groupsByLevel as MenuItemType[][]).forEach((groups: MenuItemType[], index: number) => {
        menuItems.push({
          Icon: index === 0
            ? PipelineV3
            : index === 1
              ? BatchPipeline
              : BlockGenericV2Partial,
          items: groups.map((group: MenuItemType, index2: number) => {
            const {
              children,
              description,
              name,
              uuid,
            } = group as any;

            return {
              description,
              items: children?.map(
                (block: Block, index3: number) => menuItemsForBlock(
                  block,
                  (event: MouseEvent, item: MenuGroupType) => {
                    onClick(event, {
                      ...item,
                      groups: [
                        ...(item.groups ?? []),
                        {
                          ...group,
                          index: index2,
                          level: 0,
                        } as MenuGroupType,
                      ],
                    });
                  },
                  1,
                  index3,
                ),
              ),
              label: name || uuid,
              onClick: (event: MouseEvent, item: MenuGroupType) => {
                onClick(event, {
                  ...item,
                  index: index2,
                  level: 0,
                });
              },
              uuid,
            } as any;
          }) as MenuItemType[],
          label: index === 0
            ? `${fname} pipelines`
            : index === 1
              ? 'Stages'
              : 'Operations',
          uuid: `level-${index}-grouping`,
        });
      });

      return menuItems;
    }

    setHeader({
      buildIntraAppNavItems,
      navTag: executionFramework?.name ?? executionFramework?.uuid?.toUpperCase(),
      title: pipeline?.name || pipeline?.uuid,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionFramework, groupsByLevel, handleMenuItemClick, pipeline]);

  return <div />;
}
