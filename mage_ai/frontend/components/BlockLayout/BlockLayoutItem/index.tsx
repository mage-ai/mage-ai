import { useCallback, useEffect, useMemo, useState } from 'react';

import BlockLayoutItemDetail from '../BlockLayoutItemDetail';
import BlockLayoutItemType from '@interfaces/BlockLayoutItemType';
import Button from '@oracle/elements/Button';
import ChartController from '@components/ChartBlock/ChartController';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import api from '@api';
import { Ellipsis } from '@oracle/icons';
import { ItemStyle, WIDTH_OFFSET } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { VARIABLE_NAME_HEIGHT } from '@interfaces/ChartBlockType';

type BlockLayoutItemProps = {
  block?: BlockLayoutItemType;
  blockUUID: string;
  detail?: boolean;
  height?: number;
  pageBlockLayoutUUID: string;
  setSelectedBlockItem?: (block: BlockLayoutItemType) => void;
  width?: number;
};

function BlockLayoutItem({
  block,
  blockUUID,
  detail,
  height,
  pageBlockLayoutUUID,
  setSelectedBlockItem,
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

  const buildChart = useCallback(({
    height: heightArg,
    width: widthArg,
  }) => {
    if (!data) {
      return null;
    }

    return (
      <ChartController
        block={{
          ...blockLayoutItem,
          configuration: {
            ...blockLayoutItem?.configuration,
            [VARIABLE_NAME_HEIGHT]: heightArg,
          },
        }}
        data={data}
        width={widthArg}
        xAxisLabel={blockLayoutItem?.configuration?.x_axis_label}
      />
    );
  }, [
    blockLayoutItem,
    data,
  ]);

  if (detail) {
    return (
      <BlockLayoutItemDetail
        blockLayoutItem={blockLayoutItem}
        buildChart={buildChart}
        height={height}
        width={width}
      />
    );
  }

  return (
    <ItemStyle>
      <Spacing mb={1}>
        <FlexContainer
          justifyContent="space-between"
        >
          <Text bold default>
            {blockLayoutItem?.name || blockUUID}
          </Text>

          <Button
            iconOnly
            noBackground
            onClick={() => {
              setSelectedBlockItem?.(blockLayoutItem);
            }}
          >
            <Ellipsis default />
          </Button>
        </FlexContainer>
      </Spacing>

      {!data && <Spinner inverted />}
      {data && buildChart({
        height: height || blockLayoutItem?.configuration?.[VARIABLE_NAME_HEIGHT],
        width: width - WIDTH_OFFSET,
      })}
    </ItemStyle>
  );
}

export default BlockLayoutItem;
