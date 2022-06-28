import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { BoxPlot } from '@visx/stats';
import { ThemeContext } from 'styled-components';
import { scaleLinear } from '@visx/scale';
import { useContext } from 'react';

import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import light from '@oracle/styles/themes/light';

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
  width?: number;
  height: number;
};

function BoxPlotHorizontal({
  data,
  primary,
  secondary,
  danger,
  width,
  height,
}: BoxPlotHorizontalProps) {
  const themeContext: ThemeType = useContext(ThemeContext);

  const colorMap = [
    {
      color: primary,
      fill: (themeContext.chart || light.chart).backgroundPrimary,
      stroke: (themeContext.chart || light.chart).primary,
    },
    {
      color: secondary,
      fill: (themeContext.chart || light.chart).backgroundSecondary,
      stroke: (themeContext.chart || light.chart).secondary,
    },
    {
      color: danger,
      fill: (themeContext.chart || light.chart).backgroundDanger,
      stroke: (themeContext.chart || light.chart).danger,
    },
  ];

  const colorIdx = colorMap.findIndex(el => el.color);
  const color = colorMap[Math.max(colorIdx, 0)];
  
  const { min, max, outliers } = data;
  const yMin = Math.min(Math.min(...outliers) || min, min); 
  const yMax = Math.max(Math.max(...outliers) || max, max);

  const xScale = scaleLinear<number>({
    domain: [yMin, yMax],
    range: [UNIT, width],
  });

  return (
    <svg height={height + UNIT} width={width + UNIT}>
      <BoxPlot
        {...data}
        {...color}
        boxWidth={height}
        horizontal
        rx={5}
        ry={5}
        strokeWidth={1}
        top={UNIT/2}
        valueScale={xScale}
      />
    </svg>
  );
}

function BoxPlotHorizontalContainer({
  width: parentWidth,
  height: parentHeight,
  ...props
}: BoxPlotHorizontalProps) {
  return (
    <div style={{ height: parentHeight, width: parentWidth }}>
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
