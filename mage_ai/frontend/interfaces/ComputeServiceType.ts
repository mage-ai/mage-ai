export enum ComputeServiceUUIDEnum {
  AWS_EMR = 'AWS_EMR',
  STANDALONE_CLUSTER = 'STANDALONE_CLUSTER',
};

export interface ConnectionCredentialType {
  name: string;
  required: boolean;
  valid: boolean;
  value: string;
}

export default interface ComputeServiceType {
  connection_credentials: ConnectionCredentialType[];
  uuid: ComputeServiceUUIDEnum;
}
