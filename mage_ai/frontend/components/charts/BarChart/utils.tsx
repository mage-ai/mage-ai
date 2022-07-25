import React, {
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { ThemeContext } from 'styled-components';
import { localPoint } from '@visx/event';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';

import dark from '@oracle/styles/themes/dark';
import { BLUE, GREEN, LIME, NAVY, PEACH, PINK, PURPLE, RED, YELLOW } from '@oracle/styles/colors/main';
import { REGULAR, SMALL_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';

const MAX_FIELDS_DISPLAYED: number = 50;
const MAX_LABEL_LENGTH: number = 20;

const defaultMargin = {
  bottom: 5 * UNIT,
  left: 3 * UNIT,
  right: 20 * UNIT,
  top: 0,
};

function max<D>(arr: D[], fn: (d: D) => number) {
  return Math.max(...arr.map(fn));
}

export function buildSharedProps({
  data: completeData,
  height,
  keyForYData,
  large,
  margin: marginOverride = {},
  showTooltip,
  width,
  yLabelFormat: yLabelFormatProp,
}) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const ySerialize = useCallback(d => d[keyForYData], [keyForYData]);

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
  const margin = {
    ...defaultMargin,
    ...marginOverride,
  };

  const data = completeData.slice(
    Math.max(0, completeData.length - MAX_FIELDS_DISPLAYED),
  );
  const xKeys = useMemo(() => Object.keys(data?.[0] || {}).filter(key => key !== keyForYData), [
    data,
    keyForYData,
  ]);

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
      MAX_LABEL_LENGTH
    );

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

  const handleTooltip = useCallback((
    event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>,
  ) => {
    const { x, y } = localPoint(event) || { x: 0, y: 0 };

    // Need to add buffer so tooltip displays correct value for hovered bar
    const percent = 1 - ((y - tooltipMarginBuffer / 2) / (yMax - tooltipMarginBuffer));

    const index = Math.floor(percent * dataLength);
    let d: any = data[index];
    if (typeof d === 'undefined') {
      d = data[index - 1];
    }
    if (y > tooltipMarginBuffer && y < (yMax - tooltipMarginBuffer)) {
      showTooltip?.({
        tooltipData: d,
        tooltipLeft: x,
        tooltipTop: y + margin.top,
      });
    }
  }, [
    data,
    dataLength,
    margin.top,
    showTooltip,
    tooltipMarginBuffer,
    yMax,
  ]);

  return {
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
  };
}
