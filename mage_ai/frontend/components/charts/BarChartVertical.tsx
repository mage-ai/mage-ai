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
import { buildSharedProps } from './BarChart/utils';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

type BarChartVerticalProps = {
  keyForYData?: string;
  large?: boolean;
};

type BarChartVerticalContainerProps = {
} & BarChartVerticalProps;

function BarChartVertical({
  ...props
}: BarChartVerticalProps) {
  const {
    height,
    hideTooltip,
    width,
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
  } = buildSharedProps(props);

  return width < 10 ? null : (
    <div>
      <svg height={height} width={width}>
        <Bar
          fill="transparent"
          height={height - (margin.top + margin.bottom)}
          onMouseLeave={() => hideTooltip?.()}
          onMouseMove={handleTooltip}
          onTouchMove={handleTooltip}
          onTouchStart={handleTooltip}
          rx={14}
          width={width - margin.left}
          x={margin.left}
          y={0}
        />

        <Group top={margin.top} left={margin.left}>
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
            {(barGroups) => barGroups.map((barGroup) => {
              console.log(barGroups)
              {/*return (
                <Group key={`bar-group-${barGroup.index}-${barGroup.x0}`} left={barGroup.x0}>
                  {barGroup.bars.map((bar) => (
                    <rect
                      key={`bar-group-bar-${barGroup.index}-${bar.index}-${bar.value}-${bar.key}`}
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill={bar.color}
                      rx={4}
                      onClick={() => {
                        if (!events) return;
                        const { key, value } = bar;
                        alert(JSON.stringify({ key, value }));
                      }}
                    />
                  ))}
                </Group>
              );*/}
            })}
          </BarGroup>
        </Group>
      </svg>
    </div>
  );
}

const getY = d => d.__y;

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
}

export default BarChartVerticalContainer;
