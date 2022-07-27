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
import { BuildSharedProps } from './constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { REGULAR, SMALL_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import { ThemeType } from '@oracle/styles/themes/constants';
import { isNumeric } from '@utils/string';

export const yKey = '__y';

const MAX_FIELDS_DISPLAYED: number = 50;
const MAX_LABEL_LENGTH: number = 20;

const defaultMargin = {
  bottom: UNIT * (3 + PADDING_UNITS),
  left: UNIT * PADDING_UNITS,
  right: UNIT * PADDING_UNITS,
  top: UNIT * PADDING_UNITS,
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
  orientationVertical = false,
  showTooltip,
  width,
  yLabelFormat: yLabelFormatProp,
}: BuildSharedProps) {
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
  const dataYSerialized = useMemo(() => data.map(ySerialize), [data, ySerialize]);
  const yScale = scaleBand<string>({
    domain: dataYSerialized,
    padding: 0.1,
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

  let tickValues: string[] = dataYSerialized;
  if (orientationVertical) {
    tickValues = data.reduce((acc, d) => {
      return acc.concat(xKeys.map(k => {
        const v = d[k];

        if (isNumeric(v)) {
          return parseInt(String(v));
        }

        return v;
      }));
    }, []);
  }

  const maxTickValueCharacterLength: number =
    Math.min(
      Math.max(...tickValues.map(s => String(s).length)),
      MAX_LABEL_LENGTH
    );

  // if (maxTickValueCharacterLength * 6 > margin.right * 2) {
  //   margin.right += maxTickValueCharacterLength * 5.5;
  // } else if (maxTickValueCharacterLength * 6 >= margin.right) {
  //   margin.right += maxTickValueCharacterLength * 3.75;
  // }
  margin.left += maxTickValueCharacterLength * 7;

  // bounds
  const xMax = width - (margin.left + margin.right);
  const yMax = height - (margin.top + margin.bottom);

  if (orientationVertical) {
    yScale.rangeRound([0, xMax]);
    tempScale.rangeRound([yMax, 0]);
  } else {
    yScale.rangeRound([yMax, 0]);
    tempScale.rangeRound([0, xMax]);
  }
  y1Scale.rangeRound([0, yScale.bandwidth()]);

  const dataLength = data.map(ySerialize).length;
  let tooltipMarginBuffer: number = 0;

  if (orientationVertical) {
  } else {
    tooltipMarginBuffer = yScale(tickValues[dataLength - 1]);
  }

  const handleTooltip = useCallback((
    event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>,
  ) => {
    const { x, y } = localPoint(event) || { x: 0, y: 0 };
    const xAdjusted = x - margin.left;
    const yAadjusted = y - margin.top;

    // Need to add buffer so tooltip displays correct value for hovered bar
    let percent = 0;

    if (orientationVertical) {
      percent = ((xAdjusted - tooltipMarginBuffer / 2) / (xMax - tooltipMarginBuffer));
    } else {
      percent = 1 - ((yAadjusted - tooltipMarginBuffer / 2) / (yMax - tooltipMarginBuffer));
    }

    const index = Math.floor(percent * dataLength);

    let d: any = data[index];
    if (typeof d === 'undefined') {
      d = data[index - 1];
    }


    if (orientationVertical) {
      if (xAdjusted > tooltipMarginBuffer && xAdjusted < ((xMax + margin.left) - tooltipMarginBuffer)) {
        showTooltip({
          tooltipData: d,
          tooltipLeft: x,
          tooltipTop: y,
        });
      }
    } else if (yAadjusted > tooltipMarginBuffer && yAadjusted < (yMax - tooltipMarginBuffer)) {
      showTooltip({
        tooltipData: d,
        tooltipLeft: x,
        tooltipTop: y,
      });
    }
  }, [
    data,
    dataLength,
    margin.left,
    margin.top,
    orientationVertical,
    showTooltip,
    tooltipMarginBuffer,
    xMax,
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
