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
  width?: number;
  xLabelFormat?: any;
  yLabelFormat?: any;
};

export type BarStackContainerProps = {
  xAxisLabel?: string;
  yAxisLabel?: string;
} & BarStackChartProps;

function BarStackChart({
  colors,
  data,
  getXValue,
  getYValue,
  height,
  keys,
  margin,
  numYTicks,
  showLegend,
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
  })

  const colorScale = scaleOrdinal<string, string>({
    domain: keys,
    range: colors,
  });

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <rect x={0} y={0} width={width} height={height} fill="#2E3036" rx={14} />
        <GridRows
          top={margin.top}
          left={margin.left}
          scale={yScale}
          width={xMax}
          height={yMax}
          stroke="black"
          strokeOpacity={0.2}
        />
        <Group top={margin.top}>
          <BarStack<any, string>
            data={data}
            keys={keys}
            value={(d, key) => d[key] || 0}
            x={getXValue}
            xScale={xScale}
            yScale={yScale}
            color={colorScale}
          >
            {(barStacks) =>
              barStacks.map((barStack) =>
                barStack.bars.map((bar) => {
                  return (
                    <rect
                      key={`bar-stack-${barStack.index}-${bar.index}`}
                      x={bar.x}
                      y={bar.y}
                      height={bar.height}
                      width={bar.width}
                      fill={bar.color}
                      onMouseLeave={hideTooltip}
                      onMouseMove={(event) => {
                        // TooltipInPortal expects coordinates to be relative to containerRef
                        // localPoint returns coordinates relative to the nearest SVG, which
                        // is what containerRef is set to in this example.
                        const eventSvgCoords = localPoint(event);
                        const left = bar.x + bar.width / 2;
                        showTooltip({
                          tooltipData: bar,
                          tooltipTop: eventSvgCoords?.y,
                          tooltipLeft: left,
                        });
                      }}
                    />
                  )
                }),
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
          top={yMax + margin.top}
          scale={xScale}
          stroke={dark.content.muted}
          tickFormat={xLabelFormat}
          tickLabelProps={() => ({
            fill: dark.content.muted,
            fontFamily: FONT_FAMILY_REGULAR,
            fontSize: 11,
            textAnchor: 'middle',
          })}
        />
      </svg>
      {showLegend && (
        <div
          style={{
            position: 'absolute',
            top: margin.top / 2 - 10,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            fontSize: '14px',
          }}
        >
          <LegendOrdinal scale={colorScale} direction="row" labelMargin="0 15px 0 0" />
        </div>
      )}

      {tooltipOpen && tooltipData && (
        <Tooltip
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            backgroundColor: dark.background.page,
            borderRadius: `${BORDER_RADIUS_LARGE}px`,
          }}
        >
          <Text bold color={colorScale(tooltipData.key)}>
            {tooltipData.key}
          </Text>
          <Text>{tooltipData.bar.data[tooltipData.key]}</Text>
          <Text>
            {getXValue(tooltipData.bar.data)}
          </Text>
        </Tooltip>
      )}
    </div>
  )
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
  )
}

export default BarStackContainer;
