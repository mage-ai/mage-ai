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
  yLabelFormat?: any;
};

export type SharedProps = {
  renderNoDataText?: () => string;
  renderTooltipContent?: (opts: any) => any | number | string;
  xAxisLabel?: string;
  xLabelFormat?: any;
  xNumTicks?: number;
  yAxisLabel?: string;
  yNumTicks?: number;
} & BuildSharedProps;

export type TooltipData = {
  bar: any;
  color: string;
  height: number;
  index: number;
  key: string;
  width: number;
  x: number;
  y: number | string;
};
