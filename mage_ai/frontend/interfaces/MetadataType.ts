import { ColumnTypeEnum } from './FeatureType';

export enum FeatureSetQualityEnum {
  GOOD = 'Good',
  BAD = 'Bad',
}

export default interface MetadataType {
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
