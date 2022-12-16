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
import { ColumnTypeEnum } from '@interfaces/FeatureType';
import { FONT_FAMILY_REGULAR as fontFamily } from '@oracle/styles/fonts/primary';
import { PURPLE, RED } from '@oracle/styles/colors/main';
import {
  SCATTER_PLOT_X_LABEL_MAX_LENGTH,
  SCATTER_PLOT_Y_LABEL_MAX_LENGTH,
  truncateLabel,
} from './utils/label';
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
  numXTicks?: number,
  numYTicks?: number,
  width: number,
  xAxisLabel?: string,
  yAxisLabel?: string,
} & SharedProps;

type ScatterPlotContainerProps = {
  featureMapping: {
    [key: string]: string,
  },
  scatterPlotOverview: {
    [key: string]: number[],
  },
  scatterPlotLabels?: {
    [key: string]: string[],
  },
  xFeature?: string;
  yFeature?: string;
} & SharedProps;

const getDataKey = (data) => `${data.x},${data.y}`;

const ScatterPlot = withTooltip<ScatterPlotProps>(({
  data: dataProp,
  getX: getXProp,
  getY: getYProp,
  height,
  hideTooltip,
  increasedXTicks,
  margin,
  numXTicks: numXTicksProp,
  numYTicks,
  showTooltip,
  tooltipData,
  tooltipLeft,
  tooltipTop,
  width,
  xAxisLabel,
  xLabelFormat: xLabelFormatProp,
  yAxisLabel,
  yLabelFormat: yLabelFormatProp,
  // @ts-ignore
}: ScatterPlotProps & WithTooltipProvidedProps) => {
  const getX = getXProp || (d => d?.x);
  const getY = getYProp || (d => d?.y);

  const data = [];
  const dataDuplicateCount: {
    [key: string]: number,
  } = {};
  dataProp.filter(d => !(getX(d) == null || getY(d) == null)).forEach(d => {
    const key = getDataKey(d);
    if (key in dataDuplicateCount) {
      dataDuplicateCount[key] = dataDuplicateCount[key] + 1;
    } else {
      dataDuplicateCount[key] = 1;
      data.push(d);
    }
  });

  const border = light.monotone.gray;
  const text = light.content.active;

  const xValues = data.map(d => Number(getX(d)));
  const yValues = data.map(d => Number(getY(d)));

  const xFormat = xLabelFormatProp || (x => x);
  const xLabelFormat = x => truncateLabel(xFormat(x), SCATTER_PLOT_X_LABEL_MAX_LENGTH)

  const yFormat = yLabelFormatProp || (y => y);
  const yLabelFormat = y => truncateLabel(yFormat(y), SCATTER_PLOT_Y_LABEL_MAX_LENGTH)

  const yLabelMaxLength = Math.max(...yValues.map(y => yLabelFormat(y).length));
  margin.left = (yLabelMaxLength + 3) * UNIT;

  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  const xRange = Math.max(...xValues) - Math.min(...xValues);
  const yRange = Math.max(...yValues) - Math.min(...yValues);

  const xOffset = xRange / 15;
  const yOffset = yRange / 10;

  const xScale = useMemo(() => scaleLinear<number>({
    domain: [Math.min(...xValues) - xOffset, Math.max(...xValues) + xOffset],
    range: [0, xMax],
  }), [
    xMax,
    xValues,
  ]);
  const yScale = useMemo(() => scaleLinear<number>({
    domain: [Math.min(...yValues) - yOffset, Math.max(...yValues) + yOffset],
    nice: true,
    range: [yMax, 0],
  }), [
    yMax,
    yValues,
  ]);

  const voronoiLayout = useMemo(
    () => {
      const v = voronoi({
        x: (d) => xScale(getX(d)),
        y: (d) => yScale(getY(d)),
        width: xMax,
        height: yMax,
      })
      // TODO: figure out why this errors
      try {
        return v(data);
      } catch (error) {
        // just catch the error for now
      }
    },
    [xMax, yMax, xScale, yScale],
  );
  const numXTicks = numXTicksProp ||
    (width > 520
      ? (increasedXTicks ? 20 : 10)
      : (increasedXTicks ? 10 : 5));


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
      const closest = voronoiLayout?.find(translatedPoint.x, translatedPoint.y, neighborRadius);
      if (closest) {
        const key = getDataKey(closest.data);
        let numDuplicates = dataDuplicateCount[key];
        showTooltip({
          tooltipLeft: xScale(getX(closest.data)),
          tooltipTop: yScale(getY(closest.data)),
          tooltipData: {
            point: closest.data,
            numDuplicates,
          },
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
            tickFormat={xLabelFormat}
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
            numTicks={numYTicks}
            scale={yScale}
            stroke={axisStrokeColor}
            tickFormat={yLabelFormat}
            tickLabelProps={() => ({
              fill: text,
              fontFamily,
              fontSize: SMALL_FONT_SIZE,
              textAnchor: 'end',
            })}
            tickStroke={axisStrokeColor}
          />

          {data.map((dataPoint, i) => {
            const key = getDataKey(dataPoint);
            const size = Math.log(dataDuplicateCount[key]) + 3.5;

            return (
              <Circle
                key={`point-${dataPoint[0]}-${i}`}
                className="dot"
                cx={xScale(getX(dataPoint))}
                cy={yScale(getY(dataPoint))}
                r={size}
                fill={tooltipData?.point === dataPoint ? RED : PURPLE}
              />
            )
          })}
        </Group>
      </svg>

      {tooltipData && (
        <Tooltip left={tooltipLeft} top={tooltipTop} offsetTop={margin.top + UNIT}>
          <Text center small>
            {`${xAxisLabel}: ${xLabelFormat(getX(tooltipData?.point))}`}
          </Text>
          <Text center small>
            {`${yAxisLabel}: ${yLabelFormat(getY(tooltipData?.point))}`}
          </Text>
          {tooltipData.numDuplicates > 1 && (
            <Text center small>
              {`Duplicates: ${tooltipData?.numDuplicates}`}
            </Text>
          )}
        </Tooltip>
      )}
    </>
  );
});

function ScatterPlotContainer({
  featureMapping,
  height: parentHeight,
  margin: marginArgs,
  scatterPlotLabels = {},
  scatterPlotOverview,
  xFeature: xFeatureProp,
  yFeature: yFeatureProp,
  ...props
}: ScatterPlotContainerProps) {
  const [xFeature, setXFeature] = useState<string>(xFeatureProp);
  const [yFeature, setYFeature] = useState<string>(yFeatureProp);

  const defaultMargin = {
    bottom: 5 * UNIT,
    left: 3 * UNIT,
    right: 3 * UNIT,
    top: 3 * UNIT,
  };
  const margin = {
    ...defaultMargin,
    ...marginArgs,
  };

  const features = Object.keys(scatterPlotOverview);

  const xValues = useMemo(() => scatterPlotOverview[xFeature], [xFeature])
  const yValues = useMemo(() => scatterPlotOverview[yFeature], [yFeature])

  const data = useMemo(
    () => xValues?.map((x, idx) => ({
      x: x,
      y: yValues?.[idx],
    })),
    [xValues, yValues],
  );

  const extraProps = {};
  if (xFeature in scatterPlotLabels) {
    extraProps['xLabelFormat'] = (label) => scatterPlotLabels[xFeature][label];
    extraProps['numXTicks'] = scatterPlotLabels[xFeature].length;
  }

  if (featureMapping[xFeature] === ColumnTypeEnum.TRUE_OR_FALSE) {
    extraProps['numXTicks'] = 1;
  }

  if (yFeature in scatterPlotLabels) {
    extraProps['yLabelFormat'] = (label) => scatterPlotLabels[yFeature][label];
    extraProps['numYTicks'] = scatterPlotLabels[yFeature].length;
  }

  if (featureMapping[yFeature] === ColumnTypeEnum.TRUE_OR_FALSE) {
    extraProps['numYTicks'] = 1;
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
            {features.filter(feature => feature !== yFeature).map(feature => (
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
            {features.filter(feature => feature !== xFeature).map(feature => (
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
                {...extraProps}
                data={data || []}
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
