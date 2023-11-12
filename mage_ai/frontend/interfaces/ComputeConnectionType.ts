import AWSEMRClusterType from './AWSEMRClusterType';

export enum ComputeConnectionActionEnum {
  CREATE = 'CREATE',
  DELETE = 'DELETE',
  DESELECT = 'DESELECT',
  UPDATE = 'UPDATE',
}

export enum ComputeConnectionUUIDEnum {
  CLUSTER = 'CLUSTER',
  SSH_TUNNEL = 'SSH_TUNNEL',
}

export interface SSHTunnelType {
  active: boolean;
  address: string;
  host: string
  port: number;
}

export default interface ComputeConnectionType {
  actions: ComputeConnectionActionEnum[];
  active: boolean;
  connection?: AWSEMRClusterType | SSHTunnelType;
  description?: string;
  id: ComputeConnectionUUIDEnum;
  name: string;
}
