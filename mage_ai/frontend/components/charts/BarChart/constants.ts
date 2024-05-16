export type BuildSharedProps = {
  data: {
    [key: string]: number;
  }[];
  height: number;
  keyForYData?: string;
  large?: boolean;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  orientationVertical?: boolean;
  showTooltip?: any;
  width?: number;
} & AxisLabelFormatProps;

export type TooltipFormatProps = {
  xTooltipFormat?: (
    y: string | number,
    x: string | number | null,
    tooltip: TooltipData | {
      values: number[];
    },
  ) => string | number;
  yTooltipFormat?: (
    y: string | number,
    x: string | number | null,
    tooltip: TooltipData | {
      values?: number[];
    },
  ) => string | number;
};

export type AxisLabelFormatProps = {
  yLabelFormat?: (
    value: any,
    index: number,
    values?: {
      value?: any;
      index?: number;
    }[],
  ) => string | undefined;
  xLabelFormat?: (
    value: any,
    index: number,
    values?: {
      value?: any;
      index?: number;
    }[],
  ) => string | undefined;
};

export type SharedProps = {
  renderNoDataText?: () => string;
  renderTooltipContent?: (opts: any) => any | number | string;
  tooltipFormat?: any;
  xAxisLabel?: string;
  xNumTicks?: number;
  yAxisLabel?: string;
  yNumTicks?: number;
} & BuildSharedProps &
  TooltipFormatProps &
  AxisLabelFormatProps;

export type TooltipData = {
  bar: any;
  color: string;
  height: number;
  index: number;
  key: string;
  values?: number[] | string[];
  width: number;
  x: number;
  y: number | string;
};
