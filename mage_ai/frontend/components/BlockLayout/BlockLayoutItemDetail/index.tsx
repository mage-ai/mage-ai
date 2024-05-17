import { useMemo } from 'react';

import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

type BlockLayoutItemDetailProps = {
  buildChart?: (opts: { height: number; width: number }) => void;
  height?: number;
  width?: number;
};

const CHART_BOTTOM_PADDING = UNIT * 3;

function BlockLayoutItemDetail({ buildChart, height, width }: BlockLayoutItemDetailProps) {
  const heightAdjusted = useMemo(() => height - (SCROLLBAR_WIDTH + CHART_BOTTOM_PADDING), [height]);
  return (
    <>
      {buildChart?.({
        height: heightAdjusted,
        width,
      })}
    </>
  );
}

export default BlockLayoutItemDetail;
