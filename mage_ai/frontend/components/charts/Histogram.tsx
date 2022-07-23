import React, { useCallback, useContext } from 'react';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { ThemeContext } from 'styled-components';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { defaultStyles, TooltipWithBounds, withTooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import {
  scaleBand,
  scaleLinear,
} from '@visx/scale';

import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';
import { BLACK } from '@oracle/styles/colors/main';
import {
  ColumnTypeEnum,
} from '@interfaces/FeatureType';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import {
  SMALL_FONT_SIZE,
  XXSMALL_FONT_SIZE,
} from '@oracle/styles/fonts/sizes';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  formatDateAxisLabel,
  formatDateTickLabel,
  getDateFrequencyByRange,
  getXScaleDate,
  getXScalePadding,
} from './utils/date';
import { formatNumberLabel } from './utils/label';
import { getChartColors } from './constants';

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

export type HistogramProps = {
  columnType?: string;
  data: any[] | any[];
  events?: boolean;
  getBarColor?: (opts: any) => string;
  getXValue?: (opts: any) => any;
  getYValue?: (opts: any) => any;
  height: number;
  large?: boolean;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  muted?: boolean;
  numberOfXTicks?: number;
  noPadding?: boolean;
  renderTooltipContent?: (tuple: any[]) => any;
  selected?: boolean;
  showAxisLabels?: boolean;
  showYAxisLabels?: boolean;
  showZeroes?: boolean;
  sortData?: (data: any[]) => any[];
  width?: number;
  yLabelFormat?: any;
};

export type HistogramContainerProps = {
  loading?: boolean;
} & HistogramProps;

export const maxBarCount: number = 60;

const defaultMargin = {
  bottom: UNIT,
  left: UNIT * 3,
  right: 0,
  top: UNIT * 1,
};

const Histogram = withTooltip<HistogramProps, TooltipData>(
  ({
    columnType,
    data = [],
    getBarColor,
    getXValue,
    getYValue,
    height,
    hideTooltip,
    large,
    margin: marginOverride = {},
    muted,
    noPadding,
    numberOfXTicks,
    renderTooltipContent,
    selected,
    showAxisLabels,
    showYAxisLabels: showYAxisLabelsProp,
    showTooltip,
    showZeroes,
    sortData,
    tooltipData,
    tooltipLeft,
    tooltipOpen,
    tooltipTop,
    width,
  }: HistogramProps & WithTooltipProvidedProps<TooltipData>) => {
    const fontSize = large ? SMALL_FONT_SIZE : XXSMALL_FONT_SIZE;

    const getColVal = useCallback((tuple: any) => {
      if (getXValue) {
        return getXValue(tuple);
      }

      return tuple[0];
    }, [getXValue]);
    const getColValFreq = useCallback((tuple: any) => {
      if (getYValue) {
        return getYValue(tuple);
      }

      return tuple[1];
    }, [getYValue]);

    const themeContext: ThemeType = useContext(ThemeContext);
    const isDateType: boolean = columnType === ColumnTypeEnum.DATETIME;
    let margin = {
      ...defaultMargin,
      ...marginOverride,
    };

    if (showAxisLabels) {
      margin = {
        ...margin,
        left: margin.left + UNIT,
      };
    }

    const dataSortedByCountDesc = sortData
      ? sortData(data)
      : data.sort((a, b) => b[1] - a[1]);
    let dataSample = isDateType
      ? data
        // @ts-ignore
        .sort((a: any, b: any) => new Date(a[0]) - new Date(b[0]))
        .filter((dateTuple: any) => !!dateTuple[0])
      : dataSortedByCountDesc.slice(0, maxBarCount);

    const xMax = width - (margin.left + margin.right);
    const yMax = height - (margin.bottom + margin.top);

    const xScaleDate = isDateType ? getXScaleDate(dataSample, xMax) : null;
    const dateFrequencyByRange = getDateFrequencyByRange(dataSample, xScaleDate);
    dataSample = xScaleDate
      ? Object.entries(dateFrequencyByRange)
        // @ts-ignore
        .sort((a: any, b: any) => new Date(formatDateTickLabel(a[0])) - new Date(formatDateTickLabel(b[0])))
      : dataSample;
    const maxDateFreq = xScaleDate ? Math.max(...Object.values(dateFrequencyByRange)) : 0;

    const xScaleDomain = dataSample.reduce((acc, tuple) => {
      const count: number = getColValFreq(tuple);
      if (count !== 0 || isDateType || showZeroes) {
        acc.push(getColVal(tuple));
      }
      return acc;
    }, []);

    const dataSampleCount = xScaleDomain.length;
    const xScalePadding = getXScalePadding(dataSampleCount, width, isDateType);

    const xScale = scaleBand<string>({
      domain: xScaleDomain,
      paddingInner: noPadding ? null : xScalePadding,
      range: [0, xMax],
      round: false,
    });
    const yScale = scaleLinear<number>({
      domain: [0, Math.max(...dataSample.map(getColValFreq))],
      range: [yMax, 0],
      round: true,
    });

    const chartColors = getChartColors(themeContext);

    const colors = {
      active: (themeContext?.content || light.content).active,
      default: chartColors[0],
      muted: (themeContext?.monotone || light.monotone).gray,
      selected: (themeContext?.elevation || light.elevation).visualizationAccent,
    };

    let barColor = colors['default'];
    if (muted) {
      barColor = colors['muted'];
    } else if (selected) {
      barColor = colors['selected'];
    }

    const maxColValFreq: number = dataSampleCount
      ? (isDateType ? maxDateFreq : Math.max(...dataSample.map(d => getColValFreq(d))))
      : 0;
    const numYTicks: number = 6;
    const quotient: number = Math.floor(maxColValFreq / numYTicks);
    const yFreqVals: number[] = [0];
    let count: number = 0;

    if (maxColValFreq > numYTicks) {
      while (count < maxColValFreq) {
        yFreqVals.push(count + quotient);
        count += quotient;
      }
    } else {
      while (count <= maxColValFreq) {
        yFreqVals.push(count + 1);
        count += 1;
      }
    }

    if (maxColValFreq > 9999) {
      margin = {
        ...margin,
        left: large ? UNIT * 8 : UNIT * 4.1,
      };
    } else if (maxColValFreq > 999) {
      margin = {
        ...margin,
        left: large ? UNIT * 5 : UNIT * 3.6,
      };
    }

    const yAxisLabelOffset = isDateType ? 2.25 : 0;

    const showYAxisLabels: boolean = (dataSampleCount < 10
      || columnType === ColumnTypeEnum.NUMBER
      || columnType === ColumnTypeEnum.NUMBER_WITH_DECIMALS
      || isDateType) || showYAxisLabelsProp;

    const handleTooltip = useCallback(
      (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
        const { x, y } = localPoint(event) || { x: 0, y: 0 };
        const percent = (x - (showAxisLabels ? margin.left : 0)) / xMax;
        const index = Math.floor(dataSampleCount * percent);
        let tuple = dataSample[index];
        if (typeof (tuple) === 'undefined') {
          // eslint-disable-next-line prefer-destructuring
          tuple = dataSample[0];
        }
        let colVal = getColVal(tuple);
        colVal = (colVal.length > 15) ? `${colVal.slice(0, 21)}` : colVal;
        const tooltipText: any = renderTooltipContent
          ? renderTooltipContent(tuple)
          : `${colVal} (${getColValFreq(tuple)})`;
        // const tooltipLeftPosition = (x < width / 2) ? x : (x - margin.left * 3);

        showTooltip({
          tooltipData: tooltipText,
          tooltipLeft: x - margin.left,
          tooltipTop: y + margin.top,
        });
      },
      [
        dataSample,
        dataSampleCount,
        getColVal,
        getColValFreq,
        margin.left,
        margin.top,
        renderTooltipContent,
        showAxisLabels,
        showTooltip,
        width,
      ],
    );

    return (width < 10 || !data.length) ? null : (
      <div>
        <svg
          height={height + (margin.bottom * (isDateType ? 7.5 : 3))}
          width={width}
        >
          <Group left={showAxisLabels ? margin.left : 0} top={margin.top + yAxisLabelOffset}>
            {dataSample.reduce((acc, tuple) => {
              const key: string = getColVal(tuple);
              const count: number = getColValFreq(tuple);

              if (count !== 0) {
                const barWidth = xScale.bandwidth();
                const barHeight = yMax - (yScale(count) ?? 0);
                const barX = xScale(key);
                const barY = yMax - barHeight;

                acc.push(
                  <Bar
                    fill={getBarColor ? getBarColor(tuple) : barColor}
                    height={barHeight}
                    key={`bar-${key}`}
                    onMouseLeave={() => hideTooltip()}
                    onMouseMove={handleTooltip}
                    onTouchMove={handleTooltip}
                    onTouchStart={handleTooltip}
                    width={barWidth}
                    x={barX}
                    y={barY}
                  />,
                );
              }

              return acc;
            }, [])}
          </Group>
          {showAxisLabels &&
            <>
              <AxisLeft
                left={margin.left}
                scale={yScale}
                stroke={colors.muted}
                tickFormat={formatNumberLabel}
                tickLabelProps={() => ({
                  fill: colors.active,
                  fontFamily: FONT_FAMILY_REGULAR,
                  fontSize,
                  textAnchor: 'end',
                  transform: 'translate(-2,2.5)',
                })}
                tickStroke={colors.muted}
                tickValues={yFreqVals}
                top={margin.top + yAxisLabelOffset}
              />

              <AxisBottom
                left={margin.left}
                numTicks={isDateType
                  ? undefined
                  : numberOfXTicks ? numberOfXTicks : 6}
                orientation="top"
                scale={xScaleDate || xScale}
                stroke={colors.muted}
                tickFormat={isDateType ? formatDateAxisLabel : undefined}
                tickLabelProps={(val: any) => ({
                  fill: showYAxisLabels ? colors.active : 'transparent',
                  fontFamily: FONT_FAMILY_REGULAR,
                  fontSize,
                  textAnchor: 'middle',
                  transform: isDateType
                    ? `rotate(-90,${xScaleDate(val)},0) translate(-33,10)`
                    : `translate(0, ${margin.bottom * 3})`,
                })}
                tickLineProps={{
                  transform: `translate(0,${UNIT})`,
                }}
                tickStroke={showYAxisLabels ? colors.muted : 'transparent'}
                top={yMax + margin.top + yAxisLabelOffset}
              />
            </>
          }
        </svg>

        {tooltipOpen && tooltipData && (
          <TooltipWithBounds
            left={tooltipLeft}
            style={defaultStyles}
            top={tooltipTop}
          >
            <Text color={BLACK} small>
              {tooltipData}
            </Text>
          </TooltipWithBounds>
        )}
      </div>
    );
  },
);

function HistogramContainer({
  height,
  loading,
  selected,
  width,
  ...props
}: HistogramContainerProps) {
  return (
    <>
      <div style={{ height, width }}>
        {loading && <Spinner />}

        {!loading && (
          <ParentSize>
            {({ height, width }) => (
              <Histogram
                {...props}
                height={height}
                selected={selected}
                width={width}
              />
            )}
          </ParentSize>
        )}
      </div>
    </>
  );
}

export default HistogramContainer;
