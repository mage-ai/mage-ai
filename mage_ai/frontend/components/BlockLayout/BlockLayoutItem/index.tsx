import { useEffect, useMemo, useState } from 'react';

import BlockLayoutItemType from '@interfaces/BlockLayoutItemType';
import ChartController from '@components/ChartBlock/ChartController';
import api from '@api';
import { VARIABLE_NAME_HEIGHT } from '@interfaces/ChartBlockType';

type BlockLayoutItemProps = {
  block?: BlockLayoutItemType;
  blockUUID: string;
  height?: number;
  pageBlockLayoutUUID: string;
  width?: number;
};

function BlockLayoutItem({
  block,
  blockUUID,
  height,
  pageBlockLayoutUUID,
  width,
}: BlockLayoutItemProps) {
  const [blockLayoutItem, setBlockLayoutItem] = useState<BlockLayoutItemType>(null);
  const [data, setData] = useState(null);

  const refreshInterval = useMemo(() => blockLayoutItem?.data_source?.refresh_interval, [
    blockLayoutItem,
  ]);

  const {
    data: dataBlockLayoutItem,
  } = api.block_layout_items.page_block_layouts.detail(
    encodeURIComponent(pageBlockLayoutUUID),
    encodeURIComponent(blockUUID),
    {},
    {
      refreshInterval,
      revalidateOnFocus: !refreshInterval,
    },
  );

  useEffect(() => {
    if (!blockLayoutItem && dataBlockLayoutItem?.block_layout_item) {
      setBlockLayoutItem({
        ...block,
        ...dataBlockLayoutItem?.block_layout_item,
      });
    }
  }, [
    block,
    blockLayoutItem,
    dataBlockLayoutItem,
  ]);

  useEffect(() => {
    setData(dataBlockLayoutItem?.block_layout_item?.data);
  }, [
    dataBlockLayoutItem?.block_layout_item?.data,
  ]);

  if (!data) {
    return <div />;
  }

  return (
    <ChartController
      block={{
        ...blockLayoutItem,
        configuration: {
          ...blockLayoutItem?.configuration,
          [VARIABLE_NAME_HEIGHT]: height || blockLayoutItem?.configuration?.[VARIABLE_NAME_HEIGHT],
        },
      }}
      data={data}
      width={width}
    />
  );
}

export default BlockLayoutItem;
