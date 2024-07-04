import React, { useEffect } from 'react';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import { WithOnMount } from '@mana/hooks/useWithOnMount';
import { useLayout } from '@context/v2/Layout';
import { countOccurrences, flattenArray, sortByKey } from '@utils/array';
import { MenuItemType } from '@mana/components/Menu/interfaces';

type Block = FrameworkType & PipelineExecutionFrameworkBlockType;

function menuItemsForBlock(block: Block) {
  function convertToItem({
    children,
    description,
    downstream_blocks,
    name,
    upstream_blocks,
    uuid,
  }: Block) {
    return {
      description: () => description,
      items: extractChildren(children as Block[]),
      label: () => name || uuid,
      onClick: (event: any) => true,
      uuid,
    };
  }

  function extractChildren(children: Block[]) {
    return children?.map(block => convertToItem(block as Block));
  }

  return convertToItem(block);
}

export default function HeaderUpdater({ executionFramework, groupsByLevel, pipeline }) {
  const { header: { setHeader } } = useLayout();

  useEffect(() => {
    const menuItems: MenuItemType[] = [];
    const fname = executionFramework?.name ?? executionFramework?.uuid;

    groupsByLevel.forEach((groups, index: number) => {
      menuItems.push({
        label: () => index === 0
          ? `${fname} pipelines`
          : index === 1
            ? 'Stages'
            : 'Operations',
        items: groups.map(({
          children,
          description,
          name,
          uuid,
        }) => ({
          description: () => description,
          items: children?.map(menuItemsForBlock),
          label: () => name || uuid,
          onClick: () => true,
          uuid,
        })),
        uuid: `level-${index}-grouping`,
      });
    });

    setHeader({
      intraAppNavItems: menuItems,
      navTag: executionFramework?.name ?? executionFramework?.uuid?.toUpperCase(),
      title: pipeline?.name || pipeline?.uuid,
    });
  }, [executionFramework, groupsByLevel, pipeline]);

  return <div />;
}
