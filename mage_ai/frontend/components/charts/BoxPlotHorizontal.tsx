import { BoxPlot } from '@visx/stats';
import { ThemeContext } from 'styled-components';
import { scaleLinear } from '@visx/scale';
import { useContext } from 'react';

import { ThemeType } from '@oracle/styles/themes/constants';

export type BoxPlotHorizontalProps = {
  data: {
    min: number;
    firstQuartile: number;
    median: number;
    thirdQuartile: number;
    max: number;
    outliers: number[];
  },
  primary?: boolean;
  secondary?: boolean;
  danger?: boolean;
  width: number;
};

function BoxPlotHorizontal({
  data,
  width,
  primary,
  secondary,
  danger,
}: BoxPlotHorizontalProps) {
  const themeContext: ThemeType = useContext(ThemeContext);

  const colorIdx = [primary, secondary, danger].findIndex(el => el);
  const colorMap = [
    {
      fill: themeContext.chart.backgroundPrimary,
      stroke: themeContext.chart.primary,
    },
    {
      fill: themeContext.chart.backgroundSecondary,
      stroke: themeContext.chart.secondary,
    },
    {
      fill: themeContext.chart.backgroundDanger,
      stroke: themeContext.chart.danger,
    },
  ];

  const color = colorMap[Math.max(colorIdx, 0)];
  
  const { min, max, outliers } = data;
  const yMin = Math.min(...outliers) || min; 
  const yMax = Math.max(...outliers) || max;

  const xScale = scaleLinear<number>({
    domain: [0, yMax],
    range: [yMin, yMax],
  });

  return (
    <svg>
      <BoxPlot
        {...data}
        {...color}
        boxWidth={width}
        horizontal
        strokeWidth={1}
        valueScale={xScale}
      />
    </svg>
  );
}

export default BoxPlotHorizontal;
