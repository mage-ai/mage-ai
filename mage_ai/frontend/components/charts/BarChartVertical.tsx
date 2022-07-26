import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { AxisBottom, AxisLeft } from '@visx/axis';
import {
  Bar,
  BarGroup,
  Line,
} from '@visx/shape';
import { Group } from '@visx/group';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { defaultStyles as tooltipStyles, TooltipWithBounds, withTooltip } from '@visx/tooltip';

import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import YAxisLabelContainer from './shared/YAxisLabelContainer';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR } from '@oracle/styles/fonts/sizes';
import { SharedProps, TooltipData } from './BarChart/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildSharedProps, yKey } from './BarChart/utils';

type BarChartVerticalProps = SharedProps;
type BarChartVerticalContainerProps = BarChartVerticalProps;

const BarChartVertical = withTooltip<BarChartVerticalProps, TooltipData>(({
  keyForYData = yKey,
  ...props
}: BarChartVerticalProps & WithTooltipProvidedProps<TooltipData>) => {
  const {
    height,
    hideTooltip,
    renderTooltipContent,
    tooltipData,
    tooltipLeft,
    tooltipOpen,
    tooltipTop,
    width,
    xLabelFormat,
    xNumTicks,
    yNumTicks,
  } = props;

  const {
    colorScale,
    colors,
    data,
    fontSize,
    handleTooltip,
    margin,
    tempScale,
    tickValues,
    xKeys,
    xMax,
    y1Scale,
    yLabelFormat,
    yMax,
    yScale,
    ySerialize,
  } = buildSharedProps({
    ...props,
    keyForYData,
    orientationVertical: true,
  });

  return width < 10 ? null : (
    <div>
      <svg height={height} width={width}>
        <Bar
          fill="transparent"
          height={height - (margin.top + margin.bottom)}
          onMouseLeave={() => hideTooltip()}
          onMouseMove={handleTooltip}
          onTouchMove={handleTooltip}
          onTouchStart={handleTooltip}
          rx={14}
          width={width - (margin.left + margin.right)}
          x={margin.left}
          y={0}
        />

        <Group
          left={margin.left / 2}
          top={margin.top}
        >
          <BarGroup
            color={colorScale}
            data={data}
            height={yMax}
            keys={xKeys}
            x0={ySerialize}
            x0Scale={yScale}
            x1Scale={y1Scale}
            yScale={tempScale}
          >
            {(barGroups) =>
              barGroups.map((barGroup) => (
                <Group
                  key={`bar-group-horizontal-${barGroup.index}-${barGroup.x0}`}
                  left={barGroup.x0 + margin.left}
                  top={margin.top}
                >
                  {barGroup.bars.map((bar) => {
                    return (
                      <g key={`${barGroup.index}-${bar.index}-${bar.key}`}>
                        <rect
                          fill={bar.color}
                          height={bar.height}
                          pointerEvents="none"
                          rx={4}
                          width={bar.width}
                          x={bar.x}
                          y={bar.y}
                        />
                      </g>
                    );
                  })}
                </Group>
              ))
            }
          </BarGroup>

          <AxisLeft
            left={margin.left}
            numTicks={yNumTicks}
            scale={tempScale}
            stroke={colors.muted}
            tickFormat={label => yLabelFormat(label)}
            tickLabelProps={() => ({
              fill: colors.active,
              fontFamily: FONT_FAMILY_REGULAR,
              fontSize,
              textAnchor: 'end',
              transform: 'translate(-2,2.5)',
            })}
            tickStroke={colors.muted}
            top={margin.top}
          />

          <AxisBottom
            hideTicks
            left={margin.left}
            numTicks={xNumTicks}
            scale={yScale}
            stroke={colors.muted}
            tickFormat={xLabelFormat}
            tickLabelProps={() => ({
              fill: colors.active,
              fontFamily: FONT_FAMILY_REGULAR,
              fontSize,
              textAnchor: 'middle',
            })}
            tickStroke={colors.muted}
            top={yMax + margin.top}
          />
        </Group>

        {tooltipData && (
          <g>
            <Line
              from={{
                x: tooltipLeft,
                y: margin.top,
              }}
              pointerEvents="none"
              stroke={colors.active}
              strokeDasharray="5,2"
              strokeWidth={1}
              to={{
                x: tooltipLeft,
                y: yMax + margin.top,
              }}
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

          {!renderTooltipContent && Object.entries(tooltipData).map(([k, v]) => keyForYData !== k && (
            <Text key={k} inverted small>
              {k}: {String(v).match(/[\d.]+/) ? v.toFixed(4) : v}
            </Text>
          ))}

          <br />

          <Text inverted small>
            {xLabelFormat && xLabelFormat(ySerialize(tooltipData))}
            {!xLabelFormat && ySerialize(tooltipData)}
          </Text>
        </TooltipWithBounds>
      )}
    </div>
  );
});

function BarChartVerticalContainer({
  height: parentHeight,
  width: parentWidth,
  xAxisLabel,
  yAxisLabel,
  ...props
}: BarChartVerticalContainerProps) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          height: parentHeight,
          marginBottom: UNIT,
          width: '100%',
        }}
      >
        {yAxisLabel && (
          <FlexContainer alignItems="center" fullHeight justifyContent="center" width={28}>
            <YAxisLabelContainer>
              <Text center muted small>
                {yAxisLabel}
              </Text>
            </YAxisLabelContainer>
          </FlexContainer>
        )}

        <div
          style={{
            height: parentHeight,
            width: yAxisLabel
              ? parentWidth === 0 ? parentWidth : parentWidth - 28
              : parentWidth,
          }}
        >
          <ParentSize>
            {({ height, width }) => (
              <BarChartVertical
                {...props}
                height={height}
                width={width}
              />
            )}
          </ParentSize>
        </div>
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
    </>
  );
};

export default BarChartVerticalContainer;
