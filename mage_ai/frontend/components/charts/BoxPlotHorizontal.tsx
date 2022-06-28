import ParentSize from '@visx/responsive/lib/components/ParentSize';
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
  scale?: number;
  width?: number;
  height?: number;
};

function BoxPlotHorizontal({
  data,
  primary,
  secondary,
  danger,
  scale = 1.0,
  width,
  height,
}: BoxPlotHorizontalProps) {
  const themeContext: ThemeType = useContext(ThemeContext);

  const colorMap = [
    {
      color: primary,
      fill: themeContext.chart.backgroundPrimary,
      stroke: themeContext.chart.primary,
    },
    {
      color: secondary,
      fill: themeContext.chart.backgroundSecondary,
      stroke: themeContext.chart.secondary,
    },
    {
      color: danger,
      fill: themeContext.chart.backgroundDanger,
      stroke: themeContext.chart.danger,
    },
  ];

  const colorIdx = colorMap.findIndex(el => el.color);
  const color = colorMap[Math.max(colorIdx, 0)];
  
  const { min, max, outliers } = data;
  const yMin = Math.min(...outliers) || min; 
  const yMax = Math.max(...outliers) || max;

  const xScale = scaleLinear<number>({
    domain: [0, yMax / scale],
    range: [yMin, yMax],
  });

  return (
    <svg height={height} width={width}>
      <BoxPlot
        {...data}
        {...color}
        boxWidth={height}
        horizontal
        strokeWidth={1}
        valueScale={xScale}
      />
    </svg>
  );
}

function BoxPlotHorizontalContainer({
  height: parentHeight,
  ...props
}: BoxPlotHorizontalProps) {
  return (
    <div style={{ height: parentHeight, width: '100%' }}>
      <ParentSize>
        {({ width, height }) => (
          <BoxPlotHorizontal
            {...props}
            height={height}
            width={width}
          />
        )}
      </ParentSize>
    </div>
  );
}

export default BoxPlotHorizontalContainer;
