import { BlockTypeEnum } from './BlockType';

export enum DataSourceTypeEnum {
  API = 'api',
  BIGQUERY = 'bigquery',
  FILE = 'file',
  GENERIC = 'generic',
  POSTGRES = 'postgres',
  REDSHIFT = 'redshift',
  S3 = 's3',
  SNOWFLAKE = 'snowflake',
}

export const DATA_SOURCE_TYPE_HUMAN_READABLE_NAME_MAPPING = {
  [DataSourceTypeEnum.API]: 'API',
  [DataSourceTypeEnum.BIGQUERY]: 'Google BigQuery',
  [DataSourceTypeEnum.FILE]: 'Local file',
  [DataSourceTypeEnum.GENERIC]: 'Generic (no template)',
  [DataSourceTypeEnum.POSTGRES]: 'PostgreSQL',
  [DataSourceTypeEnum.REDSHIFT]: 'Amazon Redshift',
  [DataSourceTypeEnum.S3]: 'Amazon S3',
  [DataSourceTypeEnum.SNOWFLAKE]: 'Snowflake',
};

export const DATA_SOURCE_TYPES: { [blockType in BlockTypeEnum]?: DataSourceTypeEnum[] } = {
  [BlockTypeEnum.DATA_LOADER]: [
    DataSourceTypeEnum.GENERIC,
    DataSourceTypeEnum.FILE,
    DataSourceTypeEnum.API,
    DataSourceTypeEnum.BIGQUERY,
    DataSourceTypeEnum.POSTGRES,
    DataSourceTypeEnum.REDSHIFT,
    DataSourceTypeEnum.S3,
    DataSourceTypeEnum.SNOWFLAKE,
  ],
  [BlockTypeEnum.DATA_EXPORTER]: [
    DataSourceTypeEnum.GENERIC,
    DataSourceTypeEnum.FILE,
    DataSourceTypeEnum.BIGQUERY,
    DataSourceTypeEnum.POSTGRES,
    DataSourceTypeEnum.REDSHIFT,
    DataSourceTypeEnum.S3,
    DataSourceTypeEnum.SNOWFLAKE,
  ],
};

export default DataSourceTypeEnum;
