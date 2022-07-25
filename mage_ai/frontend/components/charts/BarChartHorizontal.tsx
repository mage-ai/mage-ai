import React, {
  useCallback,
  useContext,
  useMemo,
} from 'react';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { AxisBottom, AxisLeft } from '@visx/axis';
import {
  Bar,
  BarGroupHorizontal,
  BarStackHorizontal,
  Line,
} from '@visx/shape';
import { Group } from '@visx/group';
import { ThemeContext } from 'styled-components';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { defaultStyles as tooltipStyles, TooltipWithBounds, withTooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';

import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import {
  BLUE,
  GREEN,
  LIME,
  NAVY,
  PEACH,
  PINK,
  PURPLE,
  RED,
  YELLOW,
} from '@oracle/styles/colors/main';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR, SMALL_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';

function max<D>(arr: D[], fn: (d: D) => number) {
  return Math.max(...arr.map(fn));
}

type TooltipData = {
  bar: any;
  color: string;
  height: number;
  index: number;
  key: string;
  width: number;
  x: number;
  y: number | string;
};

export type BarChartDataType = {
  x: {
    [key: string]: number;
  },
  y: number | string,
};

type SharedProps = {
  data: BarChartDataType[];
  height: number;
  large?: boolean;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  renderTooltipContent?: (opts: any) => any | number | string;
  width?: number;
  xAxisLabel?: string;
  xNumTicks?: number;
  yLabelFormat?: any;
  ySerialize?: any;
};

type BarStackHorizontalProps = SharedProps;

export type BarStackHorizontalContainerProps = SharedProps;

const MAX_FIELDS_DISPLAYED: number = 50;
const MAX_LABEL_LENGTH: number = 20;

const defaultMargin = {
  bottom: 5 * UNIT,
  left: 3 * UNIT,
  right: 20 * UNIT,
  top: 0,
};

const getY = d => d.__y;

const BarChartHorizontal = withTooltip<BarStackHorizontalProps, TooltipData>(({
  data: completeData,
  height,
  hideTooltip,
  large,
  margin: marginOverride = {},
  renderTooltipContent,
  showTooltip,
  tooltipData,
  tooltipLeft,
  tooltipOpen,
  tooltipTop,
  width,
  xAxisLabel,
  xNumTicks,
  yLabelFormat: yLabelFormatProp,
  ySerialize = getY,
}: BarStackHorizontalProps & WithTooltipProvidedProps<TooltipData>) => {
  let yLabelFormat = yLabelFormatProp;
  if (!yLabelFormat) {
    yLabelFormat = (label) => {
      if (label.length > MAX_LABEL_LENGTH) {
        return `${label.substring(0, MAX_LABEL_LENGTH)}...`;
      } else {
        return label;
      }
    };
  }
  const fontSize = large ? REGULAR : SMALL_FONT_SIZE;
  const themeContext: ThemeType = useContext(ThemeContext);
  const margin = {
    ...defaultMargin,
    ...marginOverride,
  };

  const data = completeData.slice(
    Math.max(0, completeData.length - MAX_FIELDS_DISPLAYED),
  );
  const xKeys = useMemo(() => Object.keys(data?.[0] || {}).filter(key => key !== '__y'), [data]);

  const colorScale = scaleOrdinal({
    domain: xKeys,
    // Very specific order
    range: [
      PURPLE,
      BLUE,
      RED,
      GREEN,
      YELLOW,
      PEACH,
      NAVY,
      PINK,
      LIME,
    ],
  });
  const yScale = scaleBand<string>({
    domain: data.map(ySerialize),
    padding: 0.35,
  });
  const y1Scale = scaleBand({
    domain: xKeys,
    padding: 0.1,
  });
  const tempScale = scaleLinear<number>({
    domain: [0, max(data, (d) => max(xKeys, (key) => Number(d[key])))],
  });

  const colors = {
    active: themeContext?.content.default || dark.content.default,
    backgroundPrimary: themeContext?.chart.backgroundPrimary || dark.chart.backgroundPrimary,
    backgroundSecondary: themeContext?.chart.backgroundSecondary || dark.chart.backgroundSecondary,
    muted: themeContext?.content.muted || dark.content.muted,
    primary: themeContext?.chart.primary || dark.chart.primary,
    tooltipBackground: themeContext?.background.navigation || dark.background.navigation,
  };

  const tickValues: string[] = data.map(ySerialize);
  const maxTickValueCharacterLength: number =
    Math.min(
      Math.max(...tickValues.map(s => String(s).length)),
      MAX_LABEL_LENGTH);
  if (maxTickValueCharacterLength * 6 > margin.right * 2) {
    margin.right += maxTickValueCharacterLength * 5.5;
  } else if (maxTickValueCharacterLength * 6 >= margin.right) {
    margin.right += maxTickValueCharacterLength * 3.75;
  }

  // bounds
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;
  margin.left += maxTickValueCharacterLength * 7;

  yScale.rangeRound([yMax, 0]);
  tempScale.rangeRound([0, xMax]);
  y1Scale.rangeRound([0, yScale.bandwidth()]);

  const dataLength = data.map(({ x }) => x).length;
  const tooltipMarginBuffer: number = yScale(tickValues[dataLength - 1]);

  const handleTooltip = useCallback(
    (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
      const { x, y } = localPoint(event) || { x: 0, y: 0 };

      // Need to add buffer so tooltip displays correct value for hovered bar
      const percent = 1 - ((y - tooltipMarginBuffer / 2) / (yMax - tooltipMarginBuffer));

      const index = Math.floor(percent * dataLength);
      let d: any = data[index];
      if (typeof d === 'undefined') {
        d = data[index - 1];
      }
      if (y > tooltipMarginBuffer && y < (yMax - tooltipMarginBuffer)) {
        showTooltip({
          tooltipData: d,
          tooltipLeft: x,
          tooltipTop: y + margin.top,
        });
      }
    },
    [data, dataLength, margin.top, showTooltip, tooltipMarginBuffer, yMax],
  );

  return width < 10 ? null : (
    <div>
      <svg height={height} width={width}>
        {/* <rect width={width} height={height} fill="gray" /> */}

        <Bar
          fill="transparent"
          height={height - (margin.top + margin.bottom)}
          onMouseLeave={() => hideTooltip()}
          onMouseMove={handleTooltip}
          onTouchMove={handleTooltip}
          onTouchStart={handleTooltip}
          rx={14}
          width={width - margin.left}
          x={margin.left}
          y={0}
        />

        <Group
          left={margin.left}
          top={margin.top}
        >
          <BarGroupHorizontal
            color={colorScale}
            data={data}
            keys={xKeys}
            width={xMax}
            xScale={tempScale}
            y0={ySerialize}
            y0Scale={yScale}
            y1Scale={y1Scale}
          >
            {(barGroups) =>
              barGroups.map((barGroup) => (
                <Group
                  key={`bar-group-horizontal-${barGroup.index}-${barGroup.y0}`}
                  top={barGroup.y0}
                >
                  {barGroup.bars.map((bar) => (
                    <g key={`${barGroup.index}-${bar.index}-${bar.key}`}>
                      <>
                        <rect
                          fill={bar.color}
                          height={bar.height}
                          pointerEvents="none"
                          rx={4}
                          width={bar.width}
                          x={bar.x}
                          y={bar.y}
                        />
                      </>
                    </g>
                  ))}
                </Group>
              ))
            }
          </BarGroupHorizontal>

          <AxisLeft
            hideTicks
            scale={yScale}
            stroke={colors.muted}
            tickFormat={label => yLabelFormat(label)}
            tickLabelProps={() => ({
              fill: colors.active,
              fontFamily: FONT_FAMILY_REGULAR,
              fontSize,
              style: {
                width: '10px',
              },
              textAnchor: 'end',
            })}
            tickStroke={colors.muted}
            tickValues={tickValues}
            top={2}
          />

          <AxisBottom
            label={xAxisLabel}
            labelProps={{
              fill: colors.muted,
              fontFamily: FONT_FAMILY_REGULAR,
              fontSize,
              textAnchor: 'middle',
            }}
            numTicks={xNumTicks}
            scale={tempScale}
            stroke={colors.muted}
            tickLabelProps={() => ({
              fill: colors.active,
              fontFamily: FONT_FAMILY_REGULAR,
              fontSize,
              textAnchor: 'middle',
            })}
            tickStroke={colors.muted}
            top={yMax}
          />
        </Group>

        {tooltipData && (
          <g>
            <Line
              from={{ x: margin.left, y: tooltipTop }}
              pointerEvents="none"
              stroke={BLUE}
              strokeDasharray="5,2"
              strokeWidth={1}
              to={{ x: xMax + margin.left, y: tooltipTop }}
            />
          </g>
        )}
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          style={{
            ...tooltipStyles,
            backgroundColor: colors.tooltipBackground,
          }}
          top={tooltipTop}
        >
          {renderTooltipContent && renderTooltipContent(tooltipData)}

          {!renderTooltipContent && Object.entries(tooltipData).map(([k, v]) => '__y' !== k && (
            <Text inverted small>
              {k}: {v.toFixed(4)}
            </Text>
          ))}
        </TooltipWithBounds>
      )}
    </div>
  );
});

function BarStackHorizontalContainer({
  height: parentHeight,
  width: parentWidth,
  ...props
}: BarStackHorizontalContainerProps) {
  return (
    <div
      style={{
        height: parentHeight,
        width: typeof parentWidth === 'undefined'
          ? '100%'
          : parentWidth,
      }}
    >
      <ParentSize>
        {({ width, height }) => (
          <BarChartHorizontal
            {...props}
            height={height}
            width={width}
          />
        )}
      </ParentSize>
    </div>
  );
}

export default BarStackHorizontalContainer;
