import { BlockTypeEnum } from './BlockType';

export enum DataSourceTypeEnum {
  API = 'api',
  AZURE_BLOB_STORAGE = 'azure_blob_storage',
  BIGQUERY = 'bigquery',
  FILE = 'file',
  GENERIC = 'generic',
  GOOGLE_CLOUD_STORAGE = 'google_cloud_storage',
  KAFKA = 'kafka',
  OPENSEARCH = 'opensearch',
  POSTGRES = 'postgres',
  REDSHIFT = 'redshift',
  S3 = 's3',
  SNOWFLAKE = 'snowflake',
}

export const DATA_SOURCE_TYPE_HUMAN_READABLE_NAME_MAPPING = {
  [DataSourceTypeEnum.API]: 'API',
  [DataSourceTypeEnum.AZURE_BLOB_STORAGE]: 'Azure Blob Storage',
  [DataSourceTypeEnum.BIGQUERY]: 'Google BigQuery',
  [DataSourceTypeEnum.FILE]: 'Local file',
  [DataSourceTypeEnum.GENERIC]: 'Generic (no template)',
  [DataSourceTypeEnum.GOOGLE_CLOUD_STORAGE]: 'Google Cloud Storage',
  [DataSourceTypeEnum.KAFKA]: 'Kafka',
  [DataSourceTypeEnum.OPENSEARCH]: 'OpenSearch',
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
    DataSourceTypeEnum.GOOGLE_CLOUD_STORAGE,
    DataSourceTypeEnum.POSTGRES,
    DataSourceTypeEnum.REDSHIFT,
    DataSourceTypeEnum.S3,
    DataSourceTypeEnum.AZURE_BLOB_STORAGE,
    DataSourceTypeEnum.SNOWFLAKE,
  ],
  [BlockTypeEnum.DATA_EXPORTER]: [
    DataSourceTypeEnum.GENERIC,
    DataSourceTypeEnum.FILE,
    DataSourceTypeEnum.BIGQUERY,
    DataSourceTypeEnum.GOOGLE_CLOUD_STORAGE,
    DataSourceTypeEnum.POSTGRES,
    DataSourceTypeEnum.REDSHIFT,
    DataSourceTypeEnum.S3,
    DataSourceTypeEnum.AZURE_BLOB_STORAGE,
    DataSourceTypeEnum.SNOWFLAKE,
  ],
  [BlockTypeEnum.TRANSFORMER]: [
    DataSourceTypeEnum.BIGQUERY,
    DataSourceTypeEnum.POSTGRES,
    DataSourceTypeEnum.REDSHIFT,
    DataSourceTypeEnum.SNOWFLAKE,
  ],
};

export default DataSourceTypeEnum;
