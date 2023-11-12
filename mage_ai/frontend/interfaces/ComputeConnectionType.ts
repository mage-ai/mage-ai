import AWSEMRClusterType from './AWSEMRClusterType';

export enum ComputeConnectionActionUUIDEnum {
  CREATE = 'CREATE',
  DELETE = 'DELETE',
  DESELECT = 'DESELECT',
  UPDATE = 'UPDATE',
}

export enum ComputeConnectionUUIDEnum {
  CLUSTER = 'CLUSTER',
  SSH_TUNNEL = 'SSH_TUNNEL',
}

export interface ComputeConnectionActionType {
  name: string;
  uuid: ComputeConnectionActionUUIDEnum;
}

export interface SSHTunnelType {
  active: boolean;
  address: string;
  host: string
  port: number;
}

export default interface ComputeConnectionType {
  actions: ComputeConnectionActionType[];
  active: boolean;
  connection?: AWSEMRClusterType | SSHTunnelType;
  description?: string;
  id: ComputeConnectionUUIDEnum;
  name: string;
}
