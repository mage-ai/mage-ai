import ParentSize from '@visx/responsive/lib/components/ParentSize';
import Pie, { ProvidedProps, PieArcDatum } from '@visx/shape/lib/shapes/Pie';
import React, { useContext, useState } from 'react';
import { Group } from '@visx/group';
import { ThemeContext } from 'styled-components';
import { animated, useTransition, to } from 'react-spring';
import { scaleOrdinal } from '@visx/scale';

import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { SMALL_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { getChartColors } from './constants';

const defaultMargin = {
  bottom: 0,
  left: 0,
  right: 0,
  top: 0,
};

type PieProps = {
  animate?: boolean;
  data: any[];
  height?: number;
  margin?: typeof defaultMargin;
  getX: (data: any) => string;
  getY: (data: any) => number;
  textColor?: string;
  width?: number;
};

export type PieChartProps = PieProps & {
  height?: number | string;
  width?: number | string;
  xAxisLabel?: string;
};

// react-spring transition definitions
type AnimatedStyles = { startAngle: number; endAngle: number; opacity: number };

const fromLeaveTransition = ({ endAngle }: PieArcDatum<any>) => ({
  endAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  opacity: 0,
  startAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
});
const enterUpdateTransition = ({ startAngle, endAngle }: PieArcDatum<any>) => ({
  endAngle,
  opacity: 1,
  startAngle,
});

type AnimatedPieProps<Datum> = ProvidedProps<Datum> & {
  animate?: boolean;
  delay?: number;
  getColor: (d: PieArcDatum<Datum>) => string;
  getKey: (d: PieArcDatum<Datum>) => string;
  onClickDatum: (d: PieArcDatum<Datum>) => void;
  textColor?: string;
};

function AnimatedPie<Datum>({
  animate,
  arcs,
  path,
  getKey,
  getColor,
  onClickDatum,
  textColor,
}: AnimatedPieProps<Datum>) {
  const transitions = useTransition<PieArcDatum<Datum>, AnimatedStyles>(arcs, {
    enter: enterUpdateTransition,
    from: animate ? fromLeaveTransition : enterUpdateTransition,
    keys: getKey,
    leave: animate ? fromLeaveTransition : enterUpdateTransition,
    update: enterUpdateTransition,
  });

  return transitions((props, arc, { key }) => {
    const [centroidX, centroidY] = path.centroid(arc);
    const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.1;

    return (
      <g key={key}>
        <animated.path
          d={to([props.startAngle, props.endAngle], (startAngle, endAngle) =>
            path({
              ...arc,
              endAngle,
              startAngle,
            }),
          )}
          fill={getColor(arc)}
          onClick={() => onClickDatum(arc)}
          onTouchStart={() => onClickDatum(arc)}
        />

        {hasSpaceForLabel && (
          <animated.g style={{ opacity: props.opacity }}>
            <text
              dy=".33em"
              fill={textColor}
              fontFamily={FONT_FAMILY_REGULAR}
              fontSize={SMALL_FONT_SIZE}
              pointerEvents="none"
              textAnchor="middle"
              x={centroidX}
              y={centroidY}
            >
              {getKey(arc)}
            </text>
          </animated.g>
        )}
      </g>
    );
  });
}

function PieChart({
  animate = true,
  data,
  getX,
  getY,
  height,
  margin = defaultMargin,
  textColor,
  width,
}: PieProps) {
  const [selectedData, setSelectedData] = useState(null);
  const themeContext: ThemeType = useContext(ThemeContext);
  const finalTextColor = textColor || (themeContext?.content.active || dark.content.active);

  if (width < 10) {
    return null;
  }

  const getColor = scaleOrdinal({
    domain: data.map(d => getX(d)),
    range: getChartColors(themeContext),
  });

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const centerY = innerHeight / 2;
  const centerX = innerWidth / 2;
  const donutThickness = Math.min(innerWidth / 4, UNIT * 12);

  return (
    <svg
      height={height}
      width={width}
    >
      <Group
        left={centerX + margin.left}
        top={centerY + margin.top}
      >
        {/* Donut */}
        <Pie
          cornerRadius={UNIT / 2}
          data={selectedData
            ? data.filter(d => JSON.stringify(d) === JSON.stringify(selectedData))
            : data
          }
          innerRadius={Math.max(radius - donutThickness, 12.25)}
          outerRadius={radius}
          padAngle={0.005}
          pieValue={getY}
        >
          {(pie) => (
            <AnimatedPie
              {...pie}
              animate={animate}
              getColor={({ data }) => getColor(getX(data))}
              getKey={({ data }) => getX(data)}
              onClickDatum={({ data }) => animate &&
                setSelectedData(
                  selectedData && JSON.stringify(selectedData) === JSON.stringify(data) ? null : data,
                )
              }
              textColor={finalTextColor}
            />
          )}
        </Pie>
      </Group>
    </svg>
  );
}

export default function PieChartContainer({
  height: heightProp,
  width: widthProp,
  xAxisLabel,
  ...props
}: PieChartProps) {
  const style: {
    height?: number;
    width?: number;
  } = {};
  if (typeof heightProp !== 'undefined') {
    style.height = heightProp;
  }
  if (typeof widthProp !== 'undefined') {
    style.width = widthProp;
  }

  return (
    <>
      <div style={style}>
        <ParentSize>
          {({ width, height }) => (
            <PieChart
              {...props}
              height={height}
              width={width}
            />
          )}
        </ParentSize>
      </div>

      {xAxisLabel && (
        <div
          style={{
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
