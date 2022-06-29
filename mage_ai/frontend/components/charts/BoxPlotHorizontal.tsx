import React, { useContext } from 'react';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { BoxPlot } from '@visx/stats';
import { ThemeContext } from 'styled-components';
import {
  TooltipWithBounds,
  defaultStyles as tooltipStyles,
  withTooltip,
} from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { findClosestNum } from '@utils/array';
import { localPoint } from '@visx/event';
import { scaleLinear } from '@visx/scale';

import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';

export type BoxPlotHorizontalProps = {
  danger?: boolean;
  data: {
    firstQuartile: number;
    max: number;
    median: number;
    min: number;
    outliers: number[];
    thirdQuartile: number;
  },
  height: number;
  primary?: boolean;
  secondary?: boolean;
  width?: number;
};

interface TooltipData {
  firstQuartile?: number;
  max?: number;
  median?: number;
  min?: number;
  name?: string;
  thirdQuartile?: number;
  value?: number;
}

const BoxPlotHorizontal = withTooltip<BoxPlotHorizontalProps, TooltipData>(
  ({
    danger,
    data,
    height,
    hideTooltip,
    primary,
    secondary,
    showTooltip,
    tooltipData,
    tooltipLeft,
    tooltipOpen,
    tooltipTop,
    width,
  }: BoxPlotHorizontalProps & WithTooltipProvidedProps<TooltipData>) => {
  const themeContext: ThemeType = useContext(ThemeContext);

  const colorMap = [
    {
      color: primary,
      fill: (themeContext?.chart || light.chart).backgroundPrimary,
      stroke: (themeContext?.chart || light.chart).primary,
    },
    {
      color: secondary,
      fill: (themeContext?.chart || light.chart).backgroundSecondary,
      stroke: (themeContext?.chart || light.chart).secondary,
    },
    {
      color: danger,
      fill: (themeContext?.chart || light.chart).backgroundDanger,
      stroke: (themeContext?.chart || light.chart).danger,
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

  const invScale = scaleLinear<number>({
    domain: [UNIT, width],
    range: [yMin, yMax],
  });

  const handleTooltip = {
    onMouseLeave: () => hideTooltip(),
    onMouseMove: (e) => {
      const { x, y } = localPoint(e) || { x: 0, y: 0 };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { outliers, ...tooltipData } = data;
      showTooltip({
        tooltipData,
        tooltipLeft: x,
        tooltipTop: y + UNIT,
      });
    },
  };

  const handleOutlierTooltip = {
    onMouseEnter: (e) => {
      const { x, y } = localPoint(e) || { x: 0, y: 0 };
      showTooltip({
        tooltipData: {
          value: findClosestNum(data.outliers, invScale(x)),
        },
        tooltipLeft: x,
        tooltipTop: y + UNIT,
      });
    },
    onMouseLeave: () => hideTooltip(),
  };

  const SUMMARY_READABLE_MAPPING = {
    firstQuartile: 'First quartile',
    max: 'Max',
    median: 'Median',
    min: 'Min',
    thirdQuartile: 'Third quartile',
    value: 'Value',
  };

  return (
    <div>
      <svg height={height + UNIT} width={width + UNIT}>
        <BoxPlot
          {...data}
          {...color}
          boxProps={handleTooltip}
          maxProps={handleTooltip}
          medianProps={handleTooltip}
          minProps={handleTooltip}
          boxWidth={height}
          horizontal
          outlierProps={handleOutlierTooltip}
          rx={5}
          ry={5}
          strokeWidth={1}
          top={UNIT / 2}
          valueScale={xScale}
        />
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          style={{
            ...tooltipStyles,
            backgroundColor: (themeContext?.background || light.background).navigation,
          }}
          top={tooltipTop}
        >
          <Text small>
            {Object.entries(tooltipData).map(([k, v]) => (
              <div key={k}>{SUMMARY_READABLE_MAPPING[k]}: {v}</div>
            ))}
          </Text>
        </TooltipWithBounds>
      )}
    </div>
  );
});

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
