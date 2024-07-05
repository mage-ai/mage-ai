import React, { useEffect } from 'react';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import { BatchPipeline, PipelineV3, BlockGenericV2Partial } from '@mana/icons';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { ItemClickHandler, HeaderProps } from './interfaces';
import { MenuItemType } from '@mana/components/Menu/interfaces';
import { WithOnMount } from '@mana/hooks/useWithOnMount';
import { countOccurrences, flattenArray, sortByKey } from '@utils/array';
import { useLayout } from '@context/v2/Layout';

type Block = FrameworkType & PipelineExecutionFrameworkBlockType;

function menuItemsForBlock(block: Block, onClick: (event: MouseEvent, item: MenuItemType) => void) {
  function convertToItem({
    children,
    description,
    // downstream_blocks,
    name,
    // upstream_blocks,
    uuid,
  }: Block) {
    return {
      description: () => description,
      items: extractChildren(children as Block[]),
      label: () => name || uuid,
      onClick,
      uuid,
    };
  }

  function extractChildren(children: Block[]) {
    return children?.map(block => convertToItem(block as Block));
  }

  return convertToItem(block);
}

export default function HeaderUpdater({ executionFramework, groupsByLevel, pipeline }: {
  executionFramework: FrameworkType;
  groupsByLevel: MenuItemType[][];
  pipeline: FrameworkType;
}) {
  const { header: { setHeader } } = useLayout();

  useEffect(() => {
    const buildIntraAppNavItems = (onClick: ItemClickHandler) => {
      const menuItems: MenuItemType[] = [];
      const fname = executionFramework?.name ?? executionFramework?.uuid;

      (groupsByLevel as MenuItemType[][]).forEach((groups: MenuItemType[], index: number) => {
        menuItems.push({
          Icon: index === 0
            ? PipelineV3
            : index === 1
              ? BatchPipeline
              : BlockGenericV2Partial,
          items: groups.map((group: MenuItemType) => {
            const {
              children,
              description,
              name,
              uuid,
            } = group as any;

            return {
              description: () => description,
              items: children?.map(
                (block: Block) => menuItemsForBlock(
                  block,
                  (event: MouseEvent, item: MenuItemType) => {
                    onClick(event, {
                      group,
                      index,
                      item,
                    });
                  },
                ),
              ),
              label: () => name || uuid,
              uuid,
            } as any;
          }) as MenuItemType[],
          label: () => index === 0
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
  }, [executionFramework, groupsByLevel, pipeline]);

  return <div />;
}
