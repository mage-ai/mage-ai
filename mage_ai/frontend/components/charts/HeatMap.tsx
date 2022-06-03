import React from 'react';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import styled from 'styled-components';
import { Group } from '@visx/group';
import { HeatmapRect } from '@visx/heatmap';
import { scaleLinear } from '@visx/scale';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';
import { FONT_FAMILY_REGULAR as fontFamily } from '@oracle/styles/fonts/primary';
import { UNIT as unit } from '@oracle/styles/units/spacing';

const border = light.monotone.grey300;
const purple = light.brand.wind400;
const text = light.monotone.black;
const white = light.monotone.white;

const title1Size = 14;

const YAxisLabelContainer = styled.div`
  -webkit-transform: rotate(-90deg);
  -moz-transform: rotate(-90deg);
  -o-transform: rotate(-90deg);
  -ms-transform: rotate(-90deg);
  transform: rotate(-90deg);
  white-space: nowrap;
`;

function max<Datum>(data: Datum[], value: (d: Datum) => number): number {
  return Math.max(...data.map(value));
}

function min<Datum>(data: Datum[], value: (d: Datum) => number): number {
  return Math.min(...data.map(value));
}

const bins = (d: any) => d.bins;
const count = (d: any) => d.count;

export type HeatmapProps = {
  data: number[][] | string[][];
  events?: boolean;
  height: number;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  width: number;
  yLabels?: number[] | string[];
};

type HeatMapContainerProps = {
  data: number[][] | string[][];
  height: number;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  xAxisLabel?: string;
  xLabels?: number[] | string[];
  yAxisLabel?: string;
  yLabels?: number[] | string[];
};

const defaultMargin = { top: 0, left: 0, right: 0, bottom: 0 };

function HeatMap ({
  data,
  events = false,
  height,
  margin: marginArgs = {},
  width,
  yLabels,
}: HeatmapProps) {
  const margin = {
    ...defaultMargin,
    ...marginArgs,
  };

  const binData = [];

  data[0].forEach((_, idx1) => {
    // @ts-ignore
    const columnValues = data.map(arr => arr[idx1]);
    binData.push({
      bin: idx1,
      bins: columnValues.reverse().map((count, idx2) => ({
        bin: idx2,
        count,
      })),
    });
  });
  const colorMax = max(binData, d => max(bins(d), count));
  const bucketSizeMax = max(binData, d => bins(d).length);

  // scales
  const xScale = scaleLinear<number>({
    domain: [0, binData.length],
  });
  const yScale = scaleLinear<number>({
    domain: [0, bucketSizeMax],
  });
  const rectColorScale = scaleLinear<string>({
    range: [border, purple],
    domain: [0, colorMax],
  });
  const opacityScale = scaleLinear<number>({
    range: [0.1, 1],
    domain: [0, colorMax],
  });

  const xMax = width - (margin.left + margin.right);
  const yMax = height - (margin.bottom + margin.top);

  const binWidth = xMax / binData.length;
  const binHeight = yMax / binData.length;

  xScale.range([0, xMax]);
  yScale.range([yMax, 0]);

  return width < 10 ? null : (
    <>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          <HeatmapRect
            data={binData}
            xScale={xScale}
            yScale={yScale}
            colorScale={rectColorScale}
            opacityScale={opacityScale}
            binWidth={binWidth}
            binHeight={binWidth}
            gap={0}
          >
            {heatmap =>
              heatmap.map(heatmapBins =>
                heatmapBins.map(bin => (
                  <svg
                    height={binHeight}
                    key={`heatmap-rect-${bin.row}-${bin.column}`}
                    width={binWidth}
                    x={bin.x}
                    y={bin.y - binHeight}
                  >
                    <rect
                      className="visx-heatmap-rect"
                      fill={bin.color}
                      fillOpacity={bin.opacity}
                      height={binHeight}
                      width={binWidth}
                    />
                    <text
                      alignmentBaseline="middle"
                      fill={bin.count >= 0.8 * colorMax ? white : text}
                      fontFamily={fontFamily}
                      fontSize={title1Size}
                      textAnchor="middle"
                      x="50%"
                      y="50%"
                    >
                      {bin.count}
                    </text>
                  </svg>
                )),
              )
            }
          </HeatmapRect>
        </Group>
      </svg>
    </>
  );
};

function HeatMapContainer({
  data,
  height: parentHeight,
  margin,
  xAxisLabel,
  xLabels,
  yAxisLabel,
  yLabels,
}: HeatMapContainerProps) {
  const displayLabel = (label: string): string => label.length > 10 ? `${label.substring(0, 10)}...` : label;
  const yAxisLabelWidth = unit * 4;
  const yLabelsWidth = unit * 8;

  let paddingLeft = 0;
  if (yAxisLabel) {
    paddingLeft += yAxisLabelWidth + (unit * 1);
  }
  if (yLabels) {
    paddingLeft += yLabelsWidth + (unit * 1);
  }

  return (
    <>
      {(xAxisLabel || xLabels) && (
        <div
          style={{
            marginBottom: margin?.bottom,
            marginLeft: margin?.left,
            marginRight: margin?.right,
            marginTop: margin?.top,
            // This is to account for the width of the y-axis label
            paddingLeft,
          }}
        >
          <Spacing mb={{ xs: 1 }}>
            {xAxisLabel && (
              <Spacing mb={1}>
                <Text center muted xsmall>
                  {xAxisLabel}
                </Text>
              </Spacing>
            )}

            {xLabels && (
              <FlexContainer>
                {/* @ts-ignore */}
                {xLabels.map(label => (
                  <Flex flex="1" key={label} justifyContent="center">
                    <Text center minWidth={70} title={label}>
                      {displayLabel(label)}
                    </Text>
                  </Flex>
                ))}
              </FlexContainer>
            )}
          </Spacing>
        </div>
      )}
      <div style={{ height: parentHeight, display: 'flex', width: '100%' }}>
        {yAxisLabel && (
          <div style={{ marginRight: 1 * unit, width: yAxisLabelWidth }}>
            <FlexContainer alignItems="center" justifyContent="center">
              <YAxisLabelContainer>
                <Text center muted xsmall>
                  {yAxisLabel}
                </Text>
              </YAxisLabelContainer>
            </FlexContainer>
          </div>
        )}
        {yLabels && (
          <div style={{ marginRight: 1 * unit }}>
            <FlexContainer
              alignItems="center"
              flexDirection="column"
              width={yLabelsWidth}
            >
              {/* @ts-ignore */}
              {yLabels.map(label => (
                <Flex alignItems="center" flex="1" key={label}>
                  <Text center title={label}>
                    {displayLabel(label)}
                  </Text>
                </Flex>
              ))}
            </FlexContainer>
          </div>
        )}
        <div style={{ height: parentHeight, width: '100%' }}>
          <ParentSize>
            {({ width, height }) => (
              <HeatMap
                data={data}
                height={height}
                margin={margin}
                width={width}
                yLabels={yLabels}
              />
            )}
          </ParentSize>
        </div>
      </div>
    </>
  );
}

export default HeatMapContainer;
