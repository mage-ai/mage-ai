import { ColumnTypeEnum } from './FeatureType';

export enum FeatureSetQualityEnum {
  GOOD = 'Good',
  BAD = 'Bad',
}

export interface MetadataType {
  column_types: {
    [key: string]: ColumnTypeEnum;
  };
  name: string;
  pipeline_id: number;
  statistics: {
    count: number;
    quality: FeatureSetQualityEnum;
  };
}

export interface PipelineMetadataType {
  feature_set_id: number;
  remote_id: number;
}
