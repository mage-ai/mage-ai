import AWSEMRClusterType from './AWSEMRClusterType';
import { SetupStepType, SetupStepUUIDEnum } from './ComputeServiceType';

export enum ComputeConnectionActionUUIDEnum {
  CREATE = 'CREATE',
  DELETE = 'DELETE',
  DESELECT = 'DESELECT',
  UPDATE = 'UPDATE',
}

export enum ComputeConnectionStateEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
}

export interface SSHTunnelType {
  active: boolean;
  address?: string;
  ec2_key_path: string;
  host?: string;
  master_public_dns_name: string;
  port?: number;
  spark_ui_host_local: string;
  spark_ui_host_remote: string;
  spark_ui_port_local: string;
  spark_ui_port_remote: string;
  ssh_username: string;
}

export interface ComputeConnectionActionType {
  name: string;
  description?: string;
  uuid: ComputeConnectionActionUUIDEnum;
}

export default interface ComputeConnectionType extends SetupStepType {
  actions: ComputeConnectionActionType[];
  attributes: {
    [key: string]: any;
  };
  connection: AWSEMRClusterType | SSHTunnelType;
  state:ComputeConnectionStateEnum;
  steps: SetupStepType[];
  uuid: SetupStepUUIDEnum,
}
