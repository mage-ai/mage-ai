export enum ExportWritePolicyEnum {
  APPEND = 'append',
  FAIL = 'fail',
  REPLACE = 'replace',
}

export const EXPORT_WRITE_POLICIES = [
  ExportWritePolicyEnum.APPEND,
  ExportWritePolicyEnum.FAIL,
  ExportWritePolicyEnum.REPLACE,
];

export enum DataProviderEnum {
  BIGQUERY = 'bigquery',
  CLICKHOUSE = 'clickhouse',
  DRUID = 'druid',
  MYSQL = 'mysql',
  POSTGRES = 'postgres',
  REDSHIFT = 'redshift',
  SNOWFLAKE = 'snowflake',
  TRINO = 'trino',
}

export default interface DataProviderType {
  id: string;
  profiles: string[];
  value: DataProviderEnum;
}
