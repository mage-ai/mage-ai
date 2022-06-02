export default interface FeatureSetType {
  id: number;
  insights: {
    feature: any;
    charts: any[];
    correlations: any[];
    time_series: any[];
  }[];
  metadata: {
    column_types: {
      [key: string]: string;
    };
    name: string;
    pipeline_id: number;
    statistics: {
      count: number;
      quality: string;
    };
  };
  pipeline?: {
    id: number;
    actions: any[];
  };
  sample_data?: {
    columns: string[];
    rows: string[][];
  };
  statistics: {
    [key: string]: any;
  };
  suggestions: any;
}
