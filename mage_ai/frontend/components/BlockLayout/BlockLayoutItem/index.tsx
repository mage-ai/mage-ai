import { useMemo } from 'react';

import BlockLayoutItemType from '@interfaces/BlockLayoutItemType';
import ChartController from '@components/ChartBlock/ChartController';
import api from '@api';

type BlockLayoutItemProps = {
  block: BlockLayoutItemType;
  pageBlockLayoutUUID: string;
};

function BlockLayoutItem({
  block,
  pageBlockLayoutUUID,
}: BlockLayoutItemProps) {
  const {
    data,
  } = api.block_layout_items.page_block_layouts.detail(
    encodeURIComponent(pageBlockLayoutUUID),
    encodeURIComponent(block?.uuid),
  );

  const blockLayoutItem: BlockLayoutItemType =
    useMemo(() => ({
      ...block,
      ...data?.block_layout_item,
    }), [
      block,
      data,
    ]);

  return (
    <div />
  );
}

export default BlockLayoutItem;
