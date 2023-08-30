import { useMemo } from 'react';

import BlockLayoutItemType from '@interfaces/BlockLayoutItemType';
import ChartController from '@components/ChartBlock/ChartController';
import api from '@api';

type BlockLayoutItemProps = {
  block?: BlockLayoutItemType;
  blockUUID: string;
  pageBlockLayoutUUID: string;
};

function BlockLayoutItem({
  block,
  blockUUID,
  pageBlockLayoutUUID,
}: BlockLayoutItemProps) {
  const {
    data,
  } = api.block_layout_items.page_block_layouts.detail(
    encodeURIComponent(pageBlockLayoutUUID),
    encodeURIComponent(blockUUID),
  );

  const blockLayoutItem: BlockLayoutItemType =
    useMemo(() => ({
      ...block,
      ...data?.block_layout_item,
    }), [
      block,
      data,
    ]);

  if (!blockLayoutItem?.data) {
    return <div />;
  }

  return (
    <ChartController
      block={blockLayoutItem}
      data={blockLayoutItem?.data}
      width={100}
    />
  );
}

export default BlockLayoutItem;
