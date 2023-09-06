import { useMemo } from 'react';

import BlockLayoutItemType from '@interfaces/BlockLayoutItemType';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

type BlockLayoutItemDetailProps = {
  blockLayoutItem: BlockLayoutItemType;
  buildChart?: (opts: {
    height: number;
    width: number;
  }) => void;
  height?: number;
  width?: number;
};

const CHART_BOTTOM_PADDING = UNIT * 3;

function BlockLayoutItemDetail({
  blockLayoutItem,
  buildChart,
  height,
  width,
}: BlockLayoutItemDetailProps) {
  const heightAdjusted = useMemo(() => height - (SCROLLBAR_WIDTH + CHART_BOTTOM_PADDING), [height]);
  const chart = useMemo(() => buildChart?.({
    height: heightAdjusted,
    width,
  }), [
    buildChart,
    heightAdjusted,
    width,
  ]);

  return (
    <>
      {chart}
    </>
  );
}

export default BlockLayoutItemDetail;
