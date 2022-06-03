export enum FeatureSetQualityEnum {
  GOOD = 'Good',
  BAD = 'Bad',
}

export default interface MetadataType {
  column_types: {
    [key: string]: string;
  };
  name: string;
  pipeline_id: number;
  statistics: {
    count: number;
    quality: FeatureSetQualityEnum;
  };
}
