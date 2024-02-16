import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { AxisBottom, AxisLeft } from '@visx/axis';
import {
  Bar,
  BarGroupHorizontal,
  BarStackHorizontal,
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
import { isNumeric } from '@utils/string';

type BarStackHorizontalProps = SharedProps;
type BarStackHorizontalContainerProps = BarStackHorizontalProps;

const MAX_FIELDS_DISPLAYED: number = 50;
const MAX_LABEL_LENGTH: number = 20;
const Y_TICK_HEIGHT = UNIT * 3;

const defaultMargin = {
  bottom: 5 * UNIT,
  left: 3 * UNIT,
  right: 20 * UNIT,
  top: 0,
};

const BarChartHorizontal = withTooltip<BarStackHorizontalProps, TooltipData>(({
  data: completeData,
  height,
  hideTooltip,
  keyForYData = yKey,
  large,
  margin: marginOverride = {},
  renderNoDataText,
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
}: BarStackHorizontalProps & WithTooltipProvidedProps<TooltipData>) => {
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
    data: completeData,
    height,
    keyForYData,
    large,
    margin: marginOverride,
    showTooltip,
    width,
    yLabelFormat: yLabelFormatProp,
  });


  const tickValuesToDisplay = [];
  const ticksToShow = Math.min((tickValues?.length || 0), Math.floor(height / Y_TICK_HEIGHT));
  tickValues?.forEach((val) => {
    tickValuesToDisplay.push(val);
  });

  return width < 10 ? null : (
    <div>
      <svg height={height} width={width}>
        {renderNoDataText && !data?.length && (
          <text
            fill={colors.active}
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily={FONT_FAMILY_REGULAR}
            fontSize={fontSize}
            x="50%"
            y="50%"
          >
            {renderNoDataText()}
          </text>
        )}

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
          y={margin.top}
        />

        {data?.length && (
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
              tickValues={tickValuesToDisplay}
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
        )}


        {tooltipData && (
          <g>
            <Line
              from={{ x: margin.left, y: tooltipTop }}
              pointerEvents="none"
              stroke={colors.active}
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

          {!renderTooltipContent && Object.entries(tooltipData).map(([k, v]) => {
            if (keyForYData !== k) {
              let valueToDisplay = v;

              if (isNumeric(valueToDisplay)) {
                if (String(valueToDisplay).split('.').length >= 2) {
                  if (typeof valueToDisplay !== 'undefined' && valueToDisplay !== null && isNumeric(valueToDisplay)) {
                    valueToDisplay = valueToDisplay?.toFixed(4);
                  }
                }
              }

              return (
                <Text key={k} inverted small>
                  {k}: {valueToDisplay}
                </Text>
              );
            }
          })}
        </TooltipWithBounds>
      )}
    </div>
  );
});

function BarStackHorizontalContainer({
  height: parentHeight,
  width: parentWidth,
  xAxisLabel,
  yAxisLabel,
  ...props
}: BarStackHorizontalContainerProps) {
  let parentWidthFinal;

  if (typeof parentWidth === 'undefined') {
    parentWidthFinal = '100%';
  } else {
    parentWidthFinal = yAxisLabel
      ? parentWidth === 0 ? parentWidth : parentWidth - 28
      : parentWidth;
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          height: parentHeight,
          marginBottom: xAxisLabel ? UNIT : null,
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

        <div style={{
          height: parentHeight,
          width: parentWidthFinal,
        }}>
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
}

export default BarStackHorizontalContainer;
