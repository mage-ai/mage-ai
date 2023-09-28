import FeatureType, { FeatureResponseType } from '@interfaces/FeatureType';

export enum LabelTypeEnum {
  RANGE = 'range',
}

interface XMetadataType {
  label: string;
  label_type?: LabelTypeEnum;
}

export enum ChartTypeEnum {
  BAR_HORIZONTAL = 'bar_horizontal',
  LINE_CHART = 'line_chart',
  HISTOGRAM = 'histogram',
}

export interface ChartType {
  type: ChartTypeEnum;
  x: {
    label?: string;
    max?: number;
    min?: number;
  }[];
  x_metadata: XMetadataType;
  y: {
    count?: number;
    value?: number | string;
  }[];
}

export interface InsightsOverviewType {
  correlations: {
    correlations: ChartType[];
    feature: FeatureType;
  }[];
  time_series: ChartType[];
}

export default interface InsightsType {
  charts?: ChartType[];
  correlations: ChartType[];
  feature?: FeatureResponseType;
  time_series: ChartType[];
}
