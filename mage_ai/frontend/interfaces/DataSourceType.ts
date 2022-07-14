export enum DataSourceTypeEnum {
  BIGQUERY = 'bigquery',
  FILE = 'file',
  POSTGRES = 'postgres',
  REDSHIFT = 'redshift',
  S3 = 's3',
  SNOWFLAKE = 'snowflake',
}

export const DATA_SOURCE_TYPE_HUMAN_READABLE_NAME_MAPPING = {
  [DataSourceTypeEnum.BIGQUERY]: 'Google BigQuery',
  [DataSourceTypeEnum.FILE]: 'Local file',
  [DataSourceTypeEnum.POSTGRES]: 'PostgreSQL',
  [DataSourceTypeEnum.REDSHIFT]: 'Amazon Redshift',
  [DataSourceTypeEnum.S3]: 'Amazon S3',
  [DataSourceTypeEnum.SNOWFLAKE]: 'Snowflake',
};

export const DATA_SOURCE_TYPES: DataSourceTypeEnum[] = [
  DataSourceTypeEnum.FILE,
  DataSourceTypeEnum.BIGQUERY,
  DataSourceTypeEnum.POSTGRES,
  DataSourceTypeEnum.REDSHIFT,
  DataSourceTypeEnum.S3,
  DataSourceTypeEnum.SNOWFLAKE,
];

export default DataSourceTypeEnum;
