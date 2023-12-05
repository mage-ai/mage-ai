import React from 'react';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { BarStack } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { LegendOrdinal } from '@visx/legend';
import { Tooltip, defaultStyles, useTooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';

import FlexContainer from '@oracle/components/FlexContainer';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import Text from '@oracle/elements/Text';
import YAxisLabelContainer from './shared/YAxisLabelContainer';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { UNIT } from '@oracle/styles/units/spacing';
import { formatNumber } from '@utils/number';
import { formatNumberLabel } from './utils/label';

type TooltipData = {
  bar: any;
  color: string;
  height: number;
  index: number;
  key: string;
  width: number;
  x: number;
  y: number;
};

type BarStackChartProps = {
  backgroundColor?: string;
  colors: string[];
  data: any[];
  getXValue?: (opts: any) => any;
  getYValue?: (opts: any) => any;
  height?: number;
  keys: string[];
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  numYTicks?: number;
  renderXTooltipContent?: (opts: any, index: number) => any | number | string;
  renderYTooltipContent?: (opts: any, index: number) => any | number | string;
  showLegend?: boolean;
  tooltipLeftOffset?: number;
  width?: number;
  xLabelFormat?: any;
  yLabelFormat?: any;
};

export type BarStackContainerProps = {
  xAxisLabel?: string;
  yAxisLabel?: string;
} & BarStackChartProps;

function BarStackChart({
  backgroundColor,
  colors,
  data,
  getXValue,
  getYValue,
  height,
  keys,
  margin,
  numYTicks,
  showLegend,
  tooltipLeftOffset = 0,
  width,
  xLabelFormat,
  yLabelFormat,
}: BarStackChartProps) {
  const {
    hideTooltip,
    showTooltip,
    tooltipData,
    tooltipLeft,
    tooltipOpen,
    tooltipTop,
  } = useTooltip<TooltipData>();

  const xMax = width - (margin.left + margin.right);
  const yMax = height - (margin.bottom + margin.top);

  const yValueTotals = data.reduce((allTotals, current) => {
    const yValue = current;
    const total = keys.reduce((currentTotal, k) => {
      if (Number(yValue[k])) {
        currentTotal += Number(yValue[k]);
      }
      return currentTotal;
    }, 0);
    allTotals.push(total);
    return allTotals;
  }, [] as number[]);

  const xScale = scaleBand<string>({
    domain: data.map(getXValue),
    padding: 0.4,
    range: [0, xMax],
    round: false,
  });

  const yScale = scaleLinear<number>({
    domain: [0, Math.max(...yValueTotals)],
    range: [yMax, 0],
    round: true,
  });

  let yTooltipValue = null;
  if (tooltipOpen && tooltipData) {
    yTooltipValue = tooltipData.bar.data[tooltipData.key];
    if (Number.isSafeInteger(yTooltipValue)) {
      yTooltipValue = formatNumber(yTooltipValue);
    }
  }

  const colorScale = scaleOrdinal<string, string>({
    domain: keys,
    range: colors,
  });

  return (
    <div style={{ position: 'relative', zIndex: 2 }}>
      <svg height={height} width={width}>
        <rect
          fill={backgroundColor || dark.background.chartBlock}
          height={height}
          rx={14}
          width={width}
          x={0}
          y={0}
        />
        <GridRows
          height={yMax}
          left={margin.left}
          scale={yScale}
          stroke="black"
          strokeOpacity={0.2}
          top={margin.top}
          width={xMax}
        />
        <Group left={margin.left} top={margin.top}>
          <BarStack<any, string>
            color={colorScale}
            data={data}
            keys={keys}
            value={(d, key) => d[key] || 0}
            x={getXValue}
            xScale={xScale}
            yScale={yScale}
          >
            {(barStacks) =>
              barStacks.map((barStack) =>
                barStack.bars.map((bar) => (
                  <rect
                    fill={bar.color}
                    height={bar.height}
                    key={`bar-stack-${barStack.index}-${bar.index}`}
                    onMouseLeave={hideTooltip}
                    onMouseMove={(event) => {
                      // TooltipInPortal expects coordinates to be relative to containerRef
                      // localPoint returns coordinates relative to the nearest SVG, which
                      // is what containerRef is set to in this example.
                      const eventSvgCoords = localPoint(event);
                      const left = bar.x + bar.width / 2 + tooltipLeftOffset;
                      showTooltip({
                        tooltipData: bar,
                        tooltipLeft: left,
                        tooltipTop: eventSvgCoords?.y + 10,
                      });
                    }}
                    width={bar.width}
                    x={bar.x}
                    y={bar.y}
                  />
                )),
              )
            }
          </BarStack>
        </Group>
        <AxisLeft
          hideTicks
          left={margin.left}
          numTicks={numYTicks}
          scale={yScale}
          stroke={dark.content.muted}
          tickFormat={label => yLabelFormat ? yLabelFormat(label) : formatNumberLabel(label)}
          tickLabelProps={() => ({
            fill: dark.content.muted,
            fontFamily: FONT_FAMILY_REGULAR,
            fontSize: 11,
            textAnchor: 'end',
            transform: 'translate(0,2.5)',
          })}
          top={margin.top}
        />
        <AxisBottom
          hideTicks
          left={margin.left}
          scale={xScale}
          stroke={dark.content.muted}
          tickFormat={xLabelFormat}
          tickLabelProps={() => ({
            fill: dark.content.muted,
            fontFamily: FONT_FAMILY_REGULAR,
            fontSize: 11,
            textAnchor: 'middle',
          })}
          top={yMax + margin.top}
        />
      </svg>
      {showLegend && (
        <div
          style={{
            display: 'flex',
            fontSize: '14px',
            justifyContent: 'center',
            position: 'absolute',
            top: margin.top / 2 - 10,
            width: '100%',
          }}
        >
          <LegendOrdinal
            direction="row"
            labelMargin="0 15px 0 0"
            scale={colorScale}
          />
        </div>
      )}

      {tooltipOpen && tooltipData && (
        <Tooltip
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            backgroundColor: dark.background.page,
            borderRadius: `${BORDER_RADIUS_LARGE}px`,
            padding: '.3rem .4rem',
          }}
          top={tooltipTop}
        >
          <Text bold color={colorScale(tooltipData.key)}>
            {tooltipData.key}
          </Text>
          <Text>{yTooltipValue}</Text>
          <Text>
            {getXValue(tooltipData.bar.data)}
          </Text>
        </Tooltip>
      )}
    </div>
  );
}

function BarStackContainer({
  height: parentHeight,
  width: parentWidth,
  xAxisLabel,
  yAxisLabel,
  ...props
}: BarStackContainerProps) {
  return (
    <>
      <div style={{ height: parentHeight, marginBottom: UNIT, width: parentWidth }}>
        {yAxisLabel && (
          <FlexContainer alignItems="center" fullHeight justifyContent="center" width={28}>
            <YAxisLabelContainer>
              <Text center muted small>
                {yAxisLabel}
              </Text>
            </YAxisLabelContainer>
          </FlexContainer>
        )}

        <div style={{
          height: parentHeight,
          width: yAxisLabel
            ? parentWidth === 0 ? parentWidth : parentWidth - 28
            : parentWidth,
        }}>
          <ParentSize>
            {({ height, width }) => (
              <BarStackChart
                {...props}
                height={height}
                width={width}
              />
            )}
          </ParentSize>
        </div>

        {xAxisLabel && (
          <div
            style={{
              // This is to account for the width of the y-axis label
              paddingLeft: yAxisLabel ? 28 + 8 : 0,
              paddingTop: 4,
            }}
          >
            <Text center muted small>
              {xAxisLabel}
            </Text>
          </div>
        )}
      </div>
    </>
  );
}

export default BarStackContainer;
