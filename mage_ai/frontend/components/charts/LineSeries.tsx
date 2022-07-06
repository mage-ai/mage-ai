import React, { useCallback, useContext, useMemo } from 'react';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import styled, { ThemeContext } from 'styled-components';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Bar, Line, LinePath } from '@visx/shape';
import { GridRows, GridColumns } from '@visx/grid';
import { Group } from '@visx/group';
import {
  LegendOrdinal,
  LegendItem,
  LegendLabel,
} from '@visx/legend';
import { Threshold } from '@visx/threshold';
import { Tooltip, defaultStyles, withTooltip } from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { curveBasis } from '@visx/curve';
import { localPoint } from '@visx/event';
import { range } from 'lodash';
import { scaleLinear, scaleOrdinal } from '@visx/scale';

import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';
import { AxisEnum } from '@interfaces/ActionPayloadType';
import { BLUE } from '@oracle/styles/colors/main';
import { FONT_FAMILY_REGULAR as fontFamily } from '@oracle/styles/fonts/primary';
import { SMALL_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import { UNIT, UNIT as unit } from '@oracle/styles/units/spacing';
import { binarySearch } from '@utils/array';
import { getChartColors } from './constants';
const tooltipStyles = {
  ...defaultStyles,
  backgroundColor: light.background.navigation,
  border: 'none',
};

const YAxisLabelContainer = styled.div`
  -webkit-transform: rotate(-90deg);
  -moz-transform: rotate(-90deg);
  -o-transform: rotate(-90deg);
  -ms-transform: rotate(-90deg);
  transform: rotate(-90deg);
  white-space: nowrap;
`;

type DataProps = {
  x: number;
  y: number[];
};

type SharedProps = {
  areaBetweenLines?: number[][];
  data: DataProps[];
  events?: boolean;
  getX?: (opts: any) => number;
  getY?: (opts: any) => number;
  height: number;
  increasedXTicks?: boolean;
  lineLegendNames?: string[];
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  noCurve?: boolean;
  renderXTooltipContent?: (opts: any, index: number) => any | number | string;
  renderYTooltipContent?: (opts: any, index: number) => any | number | string;
  thickStroke?: boolean;
  xLabelFormat?: any;
  yLabelFormat?: any;
};

type LineSeriesProps = {
  width: number;
} & SharedProps;

export type LineSeriesContainerProps = {
  xAxisLabel?: string;
  yAxisLabel?: string;
} & SharedProps;

const LineSeries = withTooltip<LineSeriesProps>(({
  areaBetweenLines,
  data,
  events = false,
  getX: getXProp,
  getY: getYProp,
  height,
  hideTooltip,
  increasedXTicks,
  lineLegendNames,
  margin,
  noCurve,
  renderXTooltipContent,
  renderYTooltipContent,
  showTooltip,
  thickStroke,
  tooltipData,
  tooltipLeft = 0,
  tooltipTop = [],
  width,
  xLabelFormat,
  yLabelFormat,
  // @ts-ignore
}: LineSeriesProps & WithTooltipProvidedProps) => {
  const themeContext = useContext(ThemeContext);

  const getX = getXProp || (d => d?.x);
  const getY = getYProp || ((d, idx = 0) => d?.y[idx]);

  const border = light.monotone.gray;
  const purplePastel = light.brand.wind200;
  const text = light.content.active;
  const { black, gray } = light.monotone;

  const xValues = data.map(d => Number(getX(d)));

  if (width < 10) {
    return null;
  }

  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  const maxNumberOfYValues = Math.max(...data.map(({ y }) => y.length));
  const xScale = useMemo(() => scaleLinear<number>({
    domain: [Math.min(...xValues), Math.max(...xValues)],
    range: [0, xMax],
  }), [
    xMax,
    xValues,
  ]);
  const yScaleMin = Math.min(...data.map(({ y }) => Math.min(...y)));
  const yScaleMax = Math.max(...data.map(({ y }) => Math.max(...y)));
  const yScale = useMemo(() => scaleLinear<number>({
    domain: [
      yScaleMin,
      yScaleMax,
    ],
    nice: true,
    range: [yMax, 0],
  }), [
    yMax,
    yScaleMax,
    yScaleMin,
  ]);
  const numXTicks = width > 520
    ? (increasedXTicks ? 20 : 10)
    : (increasedXTicks ? 10 : 5);

  const strokeColors = getChartColors(themeContext);
  const axisStrokeColor = text;
  const linePathProps = strokeColors.map(color => ({ stroke: color }));

  const lineLegendScale = scaleOrdinal({
    domain: lineLegendNames || [],
    range: linePathProps.map(({ stroke }) => stroke),
  });

  // tooltip handler
  const handleTooltip = useCallback(
    (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
      const { x } = localPoint(event) || { x: 0 };
      const x0 = xScale.invert(x - margin.left);
      let index = binarySearch(xValues, v => x0 >= v);
      const d0 = data[index - 1];
      const d1 = data[index];
      let d = d0;
      if (d1) {
        if (x0 - getX(d0) > getX(d1) - x0) {
          d = d1;
        } else {
          d = d0;
          index = index - 1;
        }
      }

      const tooltipTopData = range(0, maxNumberOfYValues).map(i => yScale(getY(d, i)));

      showTooltip({
        tooltipData: {
          ...d,
          index,
        },
        tooltipLeft: x,
        tooltipTop: tooltipTopData,
      });
    },
    [
      data,
      getX,
      getY,
      margin,
      showTooltip,
      xScale,
      yScale,
    ],
  );

  const curveProps: { curve?: any } = {};
  if (!noCurve) {
    curveProps.curve = curveBasis;
  }

  return (
    <>
      {lineLegendNames && (
        <div
          style={{
            marginLeft: margin?.left,
          }}
        >
          <LegendOrdinal labelFormat={label => label} scale={lineLegendScale}>
            {labels => (
              <div style={{ display: 'flex', flexDirection: AxisEnum.ROW }}>
                {labels.map((label, i) => (
                  <LegendItem
                    key={`legend-quantile-${i}`}
                    margin="0 5px"
                    onClick={() => {
                      if (events) alert(`clicked: ${JSON.stringify(label)}`);
                    }}
                  >
                    <svg height={15} width={15}>
                      <rect fill={label.value} height={15} width={15} />
                    </svg>
                    <LegendLabel align="left" margin="0 0 0 4px">
                      <Text small>
                        {label.text}
                      </Text>
                    </LegendLabel>
                  </LegendItem>
                ))}
              </div>
            )}
          </LegendOrdinal>
        </div>
      )}

      <svg height={height} width={width}>
        {!areaBetweenLines && (
          <Bar
            fill="transparent"
            height={height}
            onMouseLeave={() => hideTooltip()}
            onMouseMove={handleTooltip}
            onTouchMove={handleTooltip}
            onTouchStart={handleTooltip}
            rx={14}
            // We add spacing on the right so the last tick label isn't covered up
            width={width - (margin.left + margin.right)}
            x={margin.left}
            y={0}
          />
        )}

        <Group left={margin.left} top={margin.top}>
          <GridRows
            height={yMax}
            pointerEvents="none"
            scale={yScale}
            stroke={border}
            strokeDasharray="3,3"
            strokeOpacity={0.4}
            width={xMax}
          />

          <GridColumns
            height={yMax}
            pointerEvents="none"
            scale={xScale}
            stroke={border}
            strokeDasharray="3,3"
            strokeOpacity={0.4}
            width={xMax}
          />

          {/* This is a vertical line at the end of the x-axis */}
          <line stroke={border} x1={xMax} x2={xMax} y1={0} y2={yMax} />

          <AxisBottom
            numTicks={numXTicks}
            scale={xScale}
            stroke={axisStrokeColor}
            tickFormat={label => xLabelFormat ? xLabelFormat(label) : label}
            tickLabelProps={(val) => ({
              fill: text,
              fontFamily,
              fontSize: SMALL_FONT_SIZE,
              textAnchor: 'middle',
              transform: `rotate(-45, ${xScale(val)}, 0) translate(-32, 4)`,
            })}
            tickStroke={axisStrokeColor}
            top={yMax}
          />

          <AxisLeft
            hideTicks
            scale={yScale}
            stroke={axisStrokeColor}
            tickFormat={label => yLabelFormat ? yLabelFormat(label) : label}
            tickLabelProps={label => ({
              dx: (String(label).length > 4) ? 3 : 0,
              fill: text,
              fontFamily,
              fontSize: SMALL_FONT_SIZE,
              textAnchor: 'end',
            })}
            tickStroke={axisStrokeColor}
          />

          {areaBetweenLines && areaBetweenLines.map((arr) => {
            const belowIdx = arr[0];
            const aboveIdx = arr[1];

            return (
              <Threshold
                {...curveProps}
                aboveAreaProps={{
                  fill: light.brand.earth400,
                  fillOpacity: 0.3,
                }}
                belowAreaProps={{
                  fill: purplePastel,
                  fillOpacity: 0.2,
                }}
                clipAboveTo={0}
                clipBelowTo={yMax}
                data={data}
                id={`${Math.random()}`}
                key={`${belowIdx}-${aboveIdx}`}
                x={d => xScale(getX(d))}
                y0={d => typeof aboveIdx === 'undefined' ? yScale(yScaleMin) : yScale(getY(d, aboveIdx))}
                y1={d => yScale(getY(d, belowIdx))}
              />
            );
          })}

          {range(0, maxNumberOfYValues).map((i) => (
            <LinePath
              {...curveProps}
              data={data}
              key={i}
              pointerEvents="none"
              strokeWidth={thickStroke ? 2 : 1}
              x={d => xScale(getX(d))}
              // @ts-ignore
              y={d => yScale(i >= d.y.length ? yScaleMin : getY(d, i))}
              {...linePathProps[i]}
            />
          ))}
        </Group>

        {tooltipData && (
          <g>
            <Line
              from={{ x: tooltipLeft, y: margin.top }}
              pointerEvents="none"
              stroke={BLUE}
              strokeDasharray="5,2"
              strokeWidth={1}
              to={{ x: tooltipLeft, y: yMax + margin.top }}
            />
            {tooltipTop.map((top, idx) => (
              <circle
                cx={tooltipLeft}
                cy={(top + 1) + margin.top}
                fill={linePathProps[idx].stroke}
                fillOpacity={0.1}
                key={idx}
                pointerEvents="none"
                r={4}
                stroke={gray}
                strokeOpacity={0.1}
                strokeWidth={1}
              />
            ))}
            {tooltipTop.map((top, idx) => (
              <circle
                cx={tooltipLeft}
                cy={(top) + margin.top}
                fill={linePathProps[idx].stroke}
                key={idx}
                pointerEvents="none"
                r={4}
                stroke={linePathProps[idx].stroke}
                strokeWidth={2}
              />
            ))}
          </g>
        )}
      </svg>

      {tooltipData && (
        <div>
          {tooltipTop.map((top, idx) => {
            const yValue = getY(tooltipData, idx);
            if (idx >= 1) {
              if (Math.abs(tooltipTop[idx - 1] - top) < unit * 5) {
                top += unit * 3;
              }
            }

            return (
              <Tooltip
                key={idx}
                left={tooltipLeft + unit}
                style={tooltipStyles}
                top={top - unit}
              >
                {renderYTooltipContent && renderYTooltipContent(tooltipData, idx)}
                {!renderYTooltipContent && (
                  <Text center small>
                    {yValue.toFixed ? yValue.toFixed(3) : yValue} {lineLegendNames[idx]}
                  </Text>
                )}
              </Tooltip>
            );
          })}

          <Tooltip
            left={tooltipLeft}
            style={{
              ...defaultStyles,
              transform: 'translateX(-65%)',
            }}
            top={yMax + margin.top}
          >
            {renderXTooltipContent && renderXTooltipContent(tooltipData)}
            {!renderXTooltipContent && (
              <Text center small>
                {getX(tooltipData).toFixed(3)}
              </Text>
            )}
          </Tooltip>
        </div>
      )}
    </>
  );
});

function LineSeriesContainer({
  areaBetweenLines,
  data,
  events = false,
  height: parentHeight,
  lineLegendNames,
  margin: marginArgs = {},
  xAxisLabel,
  xLabelFormat,
  yAxisLabel,
  yLabelFormat,
  ...props
}: LineSeriesContainerProps) {
  // Left margin is larger because it has the y-axis ticks
  const defaultMargin = {
    bottom: 3 * unit,
    left: 5 * unit,
    right: 3 * unit,
    top: 3 * unit,
  };
  const margin = {
    ...defaultMargin,
    ...marginArgs,
  };

  return (
    <>
      <div style={{ display: 'flex', height: parentHeight,  marginBottom: UNIT, width: '100%' }}>
        {yAxisLabel && (
          <FlexContainer alignItems="center" fullHeight justifyContent="center" width={28}>
            <YAxisLabelContainer>
              <Text center muted small>
                {yAxisLabel}
              </Text>
            </YAxisLabelContainer>
          </FlexContainer>
        )}

        <Spacing mr={1} />

        <div style={{ height: parentHeight, width: '100%' }}>
          <ParentSize>
            {({ width, height }) => (
              <LineSeries
                {...props}
                areaBetweenLines={areaBetweenLines}
                data={data}
                height={height}
                lineLegendNames={lineLegendNames}
                margin={margin}
                width={width}
                xLabelFormat={xLabelFormat}
                yLabelFormat={yLabelFormat}
              />
            )}
          </ParentSize>
        </div>
      </div>

      {xAxisLabel && (
        <div
          style={{
            // This is to account for the width of the y-axis label
            paddingLeft: 28 + 8,
          }}
        >
          <Text center muted small>
            {xAxisLabel}
          </Text>
        </div>
      )}
    </>
  );
}

export default LineSeriesContainer;
