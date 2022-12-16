import React, { useContext } from 'react';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import styled, { ThemeContext } from 'styled-components';
import { Group } from '@visx/group';
import { HeatmapRect } from '@visx/heatmap';
import { scaleLinear } from '@visx/scale';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';
import { FONT_FAMILY_REGULAR as fontFamily } from '@oracle/styles/fonts/primary';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT as unit } from '@oracle/styles/units/spacing';

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

export type LabelType = {
  label: number | string;
  linkProps?: {
    onClick?: () => void,
  };
};

type HeatMapSharedProps = {
  countMidpoint?: number;
  data: number[][] | string[][];
  height: number;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  minCount?: number;
  yLabels?: LabelType[];
};

export type HeatmapProps = {
  events?: boolean;
  width: number;
} & HeatMapSharedProps;

type HeatMapContainerProps = {
  xAxisLabel?: string;
  xLabels?: LabelType[];
  yAxisLabel?: string;
} & HeatMapSharedProps;

const defaultMargin = { top: 0, left: 0, right: 0, bottom: 0 };

function HeatMap ({
  countMidpoint,
  data,
  events = false,
  height,
  margin: marginArgs = {},
  minCount,
  width,
  yLabels,
}: HeatmapProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const border = (themeContext.monotone || light.monotone).grey300;
  const purple = (themeContext.brand || light.brand).wind400;
  const text = (themeContext.content || light.content).default;
  const white = (themeContext.monotone || light.monotone).white;

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
  const colorMin = min(binData, d => min(bins(d), count));
  const bucketSizeMax = max(binData, d => bins(d).length);

  const zeroOrOtherNumber = typeof countMidpoint !== 'undefined' ? countMidpoint : 0;
  const minCountValue = typeof minCount !== 'undefined' ? minCount : colorMin;

  // scales
  const xScale = scaleLinear<number>({
    domain: [0, binData.length],
  });
  const yScale = scaleLinear<number>({
    domain: [0, bucketSizeMax],
  });

  const rectColorScale = scaleLinear<string>({
    range: [border, purple],
    domain: [zeroOrOtherNumber, colorMax],
  });
  const opacityScale = scaleLinear<number>({
    range: [0.1, 1],
    domain: [zeroOrOtherNumber, colorMax],
  });
  const rectColorScaleNegative = scaleLinear<string>({
    range: [border, purple],
    domain: [minCountValue, zeroOrOtherNumber],
  });
  const opacityScaleNegative = scaleLinear<number>({
    range: [1, 0.1],
    domain: [minCountValue, zeroOrOtherNumber],
  });

  const xMax = width - (margin.left + margin.right);
  const yMax = height - (margin.bottom + margin.top);

  const binWidth = xMax / binData.length;
  const binHeight = yMax / bucketSizeMax;

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
                heatmapBins.map((bin) => {
                  let opacity = bin.opacity;
                  let color = bin.color;

                  if (typeof countMidpoint !== 'undefined' && bin.count < countMidpoint) {
                    opacity = opacityScaleNegative(bin.count);
                    color = rectColorScaleNegative(bin.count);
                  }

                  return (
                    <svg
                      height={binHeight}
                      key={`heatmap-rect-${bin.row}-${bin.column}`}
                      width={binWidth}
                      x={bin.x}
                      y={bin.y - binHeight}
                    >
                      <rect
                        className="visx-heatmap-rect"
                        fill={color}
                        fillOpacity={opacity}
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
                  );
                }),
              )
            }
          </HeatmapRect>
        </Group>
      </svg>
    </>
  );
}

function HeatMapContainer({
  countMidpoint,
  data,
  height: parentHeight,
  margin,
  minCount,
  xAxisLabel,
  xLabels,
  yAxisLabel,
  yLabels,
}: HeatMapContainerProps) {
  const displayLabel = (label: string): string => label.length > 12 ? `${label.substring(0, 12)}...` : label;
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
                {xLabels.map(({ label, linkProps }) => (
                  <Flex flex="1" key={label} justifyContent="center">
                    {linkProps ? (
                      <Link
                        bold
                        centerAlign
                        minWidth={70}
                        onClick={linkProps.onClick}
                        xsmall
                      >
                        {label}
                      </Link>
                    ) : (
                      <Text
                        bold
                        center
                        minWidth={70}
                        title={String(label)}
                        xsmall
                      >
                        {displayLabel(String(label))}
                      </Text>
                    )}
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
              fullHeight
              width={yLabelsWidth}
            >
              {/* @ts-ignore */}
              {yLabels.map(({ label, linkProps }) => (
                <Flex alignItems="center" flex="1" key={label}>
                  {linkProps ? (
                    <Link
                      bold
                      centerAlign
                      onClick={linkProps.onClick}
                      xsmall
                    >
                      {label}
                    </Link>
                  ) : (
                    <Text
                      bold
                      center
                      title={String(label)}
                      xsmall
                    >
                      {displayLabel(String(label))}
                    </Text>
                  )}
                </Flex>
              ))}
            </FlexContainer>
          </div>
        )}
        <div style={{ height: parentHeight, width: '100%' }}>
          <ParentSize>
            {({ width, height }) => (
              <HeatMap
                countMidpoint={countMidpoint}
                data={data}
                height={height}
                margin={margin}
                minCount={minCount}
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
