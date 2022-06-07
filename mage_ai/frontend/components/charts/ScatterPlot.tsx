import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar, Circle } from '@visx/shape';
import { GridColumns, GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { Tooltip, withTooltip } from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { localPoint } from '@visx/event';
import { scaleLinear } from '@visx/scale';
import { voronoi } from '@visx/voronoi';

import FlexContainer from '@oracle/components/FlexContainer';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';
import { FONT_FAMILY_REGULAR as fontFamily } from '@oracle/styles/fonts/primary';
import { PURPLE, RED } from '@oracle/styles/colors/main';
import { SMALL_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

const BeforeTextStyle = styled.div`
  margin-left: ${UNIT / 2}px;
`;

type DataProps = {
  x: number,
  y: number,
};

type SharedProps = {
  getX?: (opts: any) => number,
  getY?: (opts: any) => number,
  height: number,
  increasedXTicks?: boolean,
  margin?: { top?: number; right?: number; bottom?: number; left?: number },
  xLabelFormat?: any,
  yLabelFormat?: any,
}

type ScatterPlotProps = {
  data: DataProps[],
  width: number,
  xAxisLabel?: string,
  yAxisLabel?: string,
} & SharedProps;

type ScatterPlotContainerProps = {
  scatterPlotOverview: {
    [key: string]: number[],
  },
} & SharedProps;

const ScatterPlot = withTooltip<ScatterPlotProps>(({
  data,
  getX: getXProp,
  getY: getYProp,
  height,
  hideTooltip,
  increasedXTicks,
  margin,
  showTooltip,
  tooltipData,
  tooltipLeft,
  tooltipTop,
  width,
  xAxisLabel,
  xLabelFormat,
  yAxisLabel,
  yLabelFormat,
  // @ts-ignore
}: ScatterPlotProps & WithTooltipProvidedProps) => {
  const getX = getXProp || (d => d?.x);
  const getY = getYProp || (d => d?.y);

  const border = light.monotone.gray;
  const text = light.content.active;

  const xValues = data.map(d => Number(getX(d)));
  const yValues = data.map(d => Number(getY(d)));

  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  const xScale = useMemo(() => scaleLinear<number>({
    domain: [Math.min(...xValues), Math.max(...xValues)],
    range: [0, xMax],
  }), [
    xMax,
    xValues,
  ]);

  const yScale = useMemo(() => scaleLinear<number>({
    domain: [Math.min(...yValues), Math.max(...yValues)],
    nice: true,
    range: [yMax, 0],
  }), [
    yMax,
    yValues,
  ]);

  const voronoiLayout = useMemo(
    () =>
      voronoi({
        x: (d) => xScale(getX(d)) ?? 0,
        y: (d) => yScale(getY(d)) ?? 0,
        width: xMax,
        height: yMax,
      })(data),
    [xMax, yMax, xScale, yScale],
  );
  const numXTicks = width > 520
    ? (increasedXTicks ? 20 : 10)
    : (increasedXTicks ? 10 : 5);
  

  const axisStrokeColor = border;

  const handleTooltip = useCallback(
    (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;
      const translatedPoint = {
        x: point.x - margin.left,
        y: point.y - margin.top,
      }
      const neighborRadius = 100;
      const closest = voronoiLayout.find(translatedPoint.x, translatedPoint.y, neighborRadius);
      if (closest) {
        showTooltip({
          tooltipLeft: xScale(getX(closest.data)),
          tooltipTop: yScale(getY(closest.data)),
          tooltipData: closest.data,
        });
      }
    },
    [
      data,
      getX,
      getY,
      showTooltip,
      xScale,
      yScale,
    ],
  );

  return (
    <>
      <svg height={height} width={width}>
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
        <Group left={margin.left} pointerEvents="none" top={margin.top}>
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

          {data.map((dataPoint, i) => (
            <Circle
              key={`point-${dataPoint[0]}-${i}`}
              className="dot"
              cx={xScale(getX(dataPoint))}
              cy={yScale(getY(dataPoint))}
              r={2}
              fill={tooltipData === dataPoint ? RED : PURPLE}
            />
          ))}
        </Group>
      </svg>

      {tooltipData && (
        <Tooltip left={tooltipLeft + margin.left} top={tooltipTop}>
          <Text center small>
            {`${xAxisLabel}: ${getX(tooltipData)}`}
          </Text>
          <Text center small>
            {`${yAxisLabel}: ${getY(tooltipData)}`}
          </Text>
        </Tooltip>
      )}
    </>
  );
});

function ScatterPlotContainer({
  height: parentHeight,
  margin: marginArgs,
  scatterPlotOverview,
  ...props
}: ScatterPlotContainerProps) {
  const [xFeature, setXFeature] = useState();
  const [yFeature, setYFeature] = useState();

  const defaultMargin = {
    bottom: 3 * UNIT,
    left: 3 * UNIT,
    right: 3 * UNIT,
    top: 3 * UNIT,
  };
  const margin = {
    ...defaultMargin,
    ...marginArgs,
  };

  const features = Object.keys(scatterPlotOverview);

  let data = [];

  if (xFeature && yFeature) {
    const xValues = scatterPlotOverview[xFeature];
    const yValues = scatterPlotOverview[yFeature];
    data = xValues.map((x, idx) => ({
      x: x,
      y: yValues[idx],
    }));
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: parentHeight,
          marginBottom: UNIT,
          width: '100%',
        }}
      >
        <FlexContainer>
          <Select
            beforeIcon={
              <BeforeTextStyle>
                <Text>X</Text>
              </BeforeTextStyle>
            }
            color={PURPLE}
            label="Feature"
            onChange={e => setXFeature(e.target.value)}
            value={xFeature}
          >
            {features.map(feature => (
              <option
                key={feature}
                value={feature}
              >
                {feature}
              </option>
            ))}
          </Select>
          <Spacing mr={2} />
          <Select
            beforeIcon={
              <BeforeTextStyle>
                <Text>Y</Text>
              </BeforeTextStyle>
            }
            color={PURPLE}
            label="Feature"
            onChange={e => setYFeature(e.target.value)}
            value={yFeature}
          >
            {features.map(feature => (
              <option
                key={feature}
                value={feature}
              >
                {feature}
              </option>
            ))}
          </Select>
        </FlexContainer>
        
        <div style={{ height: parentHeight, width: '100%' }}>
          <ParentSize>
            {({ width }) => (
              <ScatterPlot
                {...props}
                data={data}
                height={parentHeight}
                margin={margin}
                width={width}
                xAxisLabel={xFeature}
                yAxisLabel={yFeature}
              />
            )}
          </ParentSize>
        </div>
      </div>
    </>
  )
}

export default ScatterPlotContainer;
