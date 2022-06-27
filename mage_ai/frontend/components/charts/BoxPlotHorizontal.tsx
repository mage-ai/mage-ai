import { BoxPlot } from '@visx/stats';
import { scaleLinear } from '@visx/scale';

export type BoxPlotHorizontalProps = {
  min: number;
  firstQuartile: number;
  median: number;
  thirdQuartile: number;
  max: number;
};

function BoxPlotHorizontal({
  min,
  firstQuartile,
  median,
  thirdQuartile,
  max,
}: BoxPlotHorizontalProps) {

  const xScale = scaleLinear<number>({
    domain: [0, max],
    range: [min, max],
  });

  return (
    <svg>
      <BoxPlot
        min={min}
        firstQuartile={firstQuartile}
        median={median}
        thirdQuartile={thirdQuartile}
        max={max}
        valueScale={xScale}
        fill="#000"
        fillOpacity={0.3}
        stroke="#000"
        strokeWidth={1}
        horizontal
      />
    </svg>
  );
}

export default BoxPlotHorizontal;
