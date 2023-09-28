export enum ReplicationMethodEnum {
  FULL_TABLE = 'FULL_TABLE',
  INCREMENTAL = 'INCREMENTAL',
  LOG_BASED = 'LOG_BASED',
}

export enum UniqueConflictMethodEnum {
  IGNORE = 'IGNORE',
  UPDATE = 'UPDATE',
}

export enum ColumnFormatEnum {
  DATE_TIME = 'date-time',
  UUID = 'uuid',
}

export const COLUMN_TYPE_CUSTOM_DATE_TIME = 'datetime';

export const ColumnFormatMapping = {
  [ColumnFormatEnum.DATE_TIME]: COLUMN_TYPE_CUSTOM_DATE_TIME,
  [ColumnFormatEnum.UUID]: ColumnFormatEnum.UUID,
};

export enum ColumnTypeEnum {
  ARRAY = 'array',
  BOOLEAN = 'boolean',
  INTEGER = 'integer',
  NULL = 'null',
  NUMBER = 'number',
  OBJECT = 'object',
  STRING = 'string',
}

export const COLUMN_TYPES = [
  ColumnTypeEnum.ARRAY,
  ColumnTypeEnum.BOOLEAN,
  COLUMN_TYPE_CUSTOM_DATE_TIME,
  ColumnTypeEnum.INTEGER,
  ColumnTypeEnum.NULL,
  ColumnTypeEnum.NUMBER,
  ColumnTypeEnum.OBJECT,
  ColumnTypeEnum.STRING,
  ColumnFormatEnum.UUID,
];

export enum BreadcrumbEnum {
  PROPERTIES = 'properties',
}

export enum InclusionEnum {
  AUTOMATIC = 'automatic',
  AVAILABLE = 'available',
  UNSUPPORTED = 'unsupported',
}

interface SchemaPropertyAnyOfType {
  type: ColumnTypeEnum[];
  items: SchemaType;
}

export interface PropertyMetadataType {
  [MetadataKeyEnum.FORCED_REPLICATION_METHOD]?: ReplicationMethodEnum,
  [MetadataKeyEnum.KEY_PROPERTIES]?: string[];
  [MetadataKeyEnum.REPLICATION_KEYS]?: string[];
  [MetadataKeyEnum.SCHEMA_NAME]?: string;
  inclusion?: InclusionEnum;
  selected?: boolean;
}

export interface SchemaPropertyType {
  anyOf?: SchemaPropertyAnyOfType[];
  format?: ColumnFormatEnum;
  metadata?: MetadataType;
  type?: ColumnTypeEnum[] | string[];
}

interface SchemaType {
  properties: {
    [columnName: string]: SchemaPropertyType;
  };
  type?: ColumnTypeEnum;
}

export enum MetadataKeyEnum {
  FORCED_REPLICATION_METHOD = 'forced-replication-method',
  KEY_PROPERTIES = 'table-key-properties',
  REPLICATION_KEYS = 'valid-replication-keys',
  SCHEMA_NAME = 'schema-name',
}

export interface MetadataType {
  breadcrumb: BreadcrumbEnum[] | string[];
  metadata: PropertyMetadataType;
}

export interface StreamType {
  auto_add_new_fields?: boolean;
  bookmark_properties?: string[];
  destination_table?: string;
  disable_column_type_check?: boolean;
  key_properties?: string[];
  metadata?: MetadataType[];
  parent_stream?: string;
  partition_keys?: string[];
  replication_key?: string;
  replication_method?: ReplicationMethodEnum;
  run_in_parallel?: boolean;
  schema?: SchemaType;
  stream?: string;
  tap_stream_id?: string;
  unique_conflict_method?: UniqueConflictMethodEnum;
  unique_constraints?: string[];
}

export interface CatalogType {
  streams: StreamType[];
}

export interface IntegrationSourceStreamType {
  streams: StreamType[];
  uuid: string;
}

export enum IntegrationSourceEnum {
  AMPLITUDE = 'amplitude',
  BIGQUERY = 'bigquery',
  CHARGEBEE = 'chargebee',
  GOOGLE_ADS = 'google_ads',
  GOOGLE_SEARCH_CONSOLE = 'google_search_console',
  GOOGLE_SHEETS = 'google_sheets',
  INTERCOM = 'intercom',
  MYSQL = 'mysql',
  PIPEDRIVE = 'pipedrive',
  POSTGRESQL = 'postgresql',
  REDSHIFT = 'redshift',
  SALESFORCE = 'salesforce',
  STRIPE = 'stripe',
}

export enum IntegrationDestinationEnum {
  BIGQUERY = 'bigquery',
  DELTA_LAKE_S3 = 'delta_lake_s3',
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  SNOWFLAKE = 'snowflake',
}

export default interface IntegrationSourceType {
  name: string;
  streams: StreamType[];
  templates: {
    [key: string]: string;
  }[];
  uuid: IntegrationSourceEnum;
}
