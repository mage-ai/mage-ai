import { BlockTypeEnum } from './BlockType';

export enum DataSourceTypeEnum {
  API = 'api',
  AZURE_BLOB_STORAGE = 'azure_blob_storage',
  AZURE_EVENT_HUB = 'azure_event_hub',
  BIGQUERY = 'bigquery',
  FILE = 'file',
  GENERIC = 'generic',
  GOOGLE_CLOUD_STORAGE = 'google_cloud_storage',
  KAFKA = 'kafka',
  KINESIS = 'kinesis',
  OPENSEARCH = 'opensearch',
  POSTGRES = 'postgres',
  REDSHIFT = 'redshift',
  S3 = 's3',
  SNOWFLAKE = 'snowflake',
}

export const DATA_SOURCE_TYPE_HUMAN_READABLE_NAME_MAPPING = {
  [DataSourceTypeEnum.API]: 'API',
  [DataSourceTypeEnum.AZURE_BLOB_STORAGE]: 'Azure Blob Storage',
  [DataSourceTypeEnum.AZURE_EVENT_HUB]: 'Azure Event Hub',
  [DataSourceTypeEnum.BIGQUERY]: 'Google BigQuery',
  [DataSourceTypeEnum.FILE]: 'Local file',
  [DataSourceTypeEnum.GENERIC]: 'Generic (no template)',
  [DataSourceTypeEnum.GOOGLE_CLOUD_STORAGE]: 'Google Cloud Storage',
  [DataSourceTypeEnum.KAFKA]: 'Kafka',
  [DataSourceTypeEnum.KINESIS]: 'Kinesis',
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
