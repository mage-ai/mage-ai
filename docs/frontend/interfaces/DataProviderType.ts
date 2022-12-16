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

export default interface DataProviderType {
  id: string;
  profiles: string[];
  value: string;
}
