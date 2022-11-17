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
}

export enum ColumnTypeEnum {
  ARRAY = 'array',
  BOOLEAN = 'boolean',
  INTEGER = 'integer',
  NULL = 'null',
  NUMBER = 'number',
  OBJECT = 'object',
  STRING = 'string',
}

export const COLUMN_TYPE_CUSTOM_DATE_TIME = 'datetime';

export const COLUMN_TYPES = [
  ColumnTypeEnum.ARRAY,
  ColumnTypeEnum.BOOLEAN,
  COLUMN_TYPE_CUSTOM_DATE_TIME,
  ColumnTypeEnum.INTEGER,
  ColumnTypeEnum.NULL,
  ColumnTypeEnum.NUMBER,
  ColumnTypeEnum.OBJECT,
  ColumnTypeEnum.STRING,
];

enum BreadcrumbEnum {
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

export interface SchemaPropertyType {
  anyOf?: SchemaPropertyAnyOfType[];
  format?: ColumnFormatEnum;
  type?: ColumnTypeEnum[];
}

interface SchemaType {
  properties: {
    [columnName: string]: SchemaPropertyType;
  };
  type: ColumnTypeEnum;
}

export interface PropertyMetadataType {
  'forced-replication-method'?: ReplicationMethodEnum,
  'schema-name'?: string;
  'table-key-properties'?: string[];
  'valid-replication-keys'?: string[];
  inclusion?: InclusionEnum;
  selected: boolean;
}

interface MetadataType {
  breadcrumb: BreadcrumbEnum | string;
  metadata: PropertyMetadataType;
}

export interface StreamType {
  auto_add_new_fields: boolean;
  bookmark_properties: string[];
  destination_table?: string;
  key_properties: string[];
  metadata: MetadataType[];
  partition_keys: string[];
  replication_key: string;
  replication_method: ReplicationMethodEnum;
  schema: SchemaType;
  stream: string;
  tap_stream_id: string;
  unique_conflict_method: UniqueConflictMethodEnum;
  unique_constraints: string[];
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
  GOOGLE_SEARCH_CONSOLE = 'google_search_console',
  GOOGLE_SHEETS = 'google_sheets',
  INTERCOM = 'intercom',
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  REDSHIFT = 'redshift',
  SALESFORCE = 'salesforce',
  STRIPE = 'stripe',
}

export enum IntegrationDestinationEnum {
  BIGQUERY = 'bigquery',
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
