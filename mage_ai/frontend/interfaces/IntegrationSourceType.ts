import BlockType from './BlockType';
import PipelineRunType from './PipelineRunType';
import PipelineScheduleType from './PipelineScheduleType';
import { PredicateOperatorEnum } from './GlobalHookType';

export enum ReplicationMethodEnum {
  FULL_TABLE = 'FULL_TABLE',
  INCREMENTAL = 'INCREMENTAL',
  LOG_BASED = 'LOG_BASED',
}

export const REPLICATION_METHODS_BATCH_PIPELINE = [
  ReplicationMethodEnum.FULL_TABLE,
  ReplicationMethodEnum.INCREMENTAL,
];

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

// TypeScript enum that defines all possible validation types for database columns
// In frontend development, enums are used to create a set of named constants
// This helps prevent typos and provides better IntelliSense/autocomplete
export enum ValidationTypeEnum {
  // General validation rules that apply to any column type
  NOT_NULL = 'not null',          // Column must have a value
  UNIQUE = 'unique',              // All values in column must be unique

  // Numeric validation rules for integers and numbers
  GREATER_THAN = '>',             // Value must be greater than specified number
  LESS_THAN = '<',                // Value must be less than specified number
  EQUAL = '=',                    // Value must equal specified number
  GREATER_THAN_OR_EQUAL = '>=',   // Value must be >= specified number
  LESS_THAN_OR_EQUAL = '<=',      // Value must be <= specified number
  NOT_EQUAL = '!=',               // Value must not equal specified number

  // String validation rules
  IN = 'in',                      // Value must be in a list (e.g., status in 'active', 'pending')
  NOT_IN = 'not in',              // Value must not be in a list
  NOT_EQUAL_STR = 'not equal',    // String must not equal specified value
  NOT_EMPTY_STRING = 'not empty string', // String must have content
  MINIMUM_LENGTH = 'minimum length',     // String must be at least N characters
  MAXIMUM_LENGTH = 'maximum length',     // String must be at most N characters
}

// TypeScript interface that defines the structure of a single validation rule
// Interfaces in TypeScript are like contracts that define what properties an object must have
export interface ValidationRuleType {
  type: ValidationTypeEnum;    // The type of validation (from enum above)
  value?: string | number;     // Optional value for rules that need a parameter
                              // e.g., for '>= 5', type would be '>=' and value would be 5
                              // The '?' makes this property optional
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
  bookmark_property_operators?: {
    [column: string]: PredicateOperatorEnum;
  };
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
  // Optional validation rules for each column in the stream
  // This uses TypeScript's index signature: [key: type]: value_type
  // It means: for any string key (column name), the value is an array of validation rules
  validation_rules?: {
    [column: string]: ValidationRuleType[];  // Each column can have multiple validation rules
  };
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
  AMAZON_S3 = 'amazon_s3',
  BIGQUERY = 'bigquery',
  DELTA_LAKE_S3 = 'delta_lake_s3',
  GOOGLE_CLOUD_STORAGE = 'google_cloud_storage',
  KAFKA = 'kafka',
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  SNOWFLAKE = 'snowflake',
}

export const DESTINATIONS_NO_UNIQUE_OR_KEY_SUPPORT: IntegrationDestinationEnum[] = [
  IntegrationDestinationEnum.AMAZON_S3,
  IntegrationDestinationEnum.GOOGLE_CLOUD_STORAGE,
  IntegrationDestinationEnum.KAFKA,
];

export interface StreamStateData {
  block: BlockType;
  name?: string;
  partition: string;
  pipeline_run: PipelineRunType;
  pipeline_schedule: PipelineScheduleType;
  streams: {
    [stream_id: string]: {
      record: {
        [column: string]: string | number | boolean;
      };
      state: {
        bookmarks: {
          [stream_id: string]: {
            [column: string]: string | number | boolean;
          };
        };
      };
    };
  };
}

export default interface IntegrationSourceType {
  name: string;
  streams: StreamType[];
  templates: {
    [key: string]: string;
  }[];
  uuid: IntegrationSourceEnum;
}
