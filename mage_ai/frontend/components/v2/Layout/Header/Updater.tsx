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

    groupsByLevel.forEach((groups, index: number) => {
      menuItems.push({
        uuid: `Level ${index}`,
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
      });
    });

    setHeader({
      intraAppNavItems: menuItems,
      navTag: executionFramework?.uuid?.toUpperCase(),
      title: pipeline?.name || pipeline?.uuid,
    });
  }, [executionFramework, groupsByLevel, pipeline]);

  return <div />;
}
