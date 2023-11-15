import AWSEMRClusterType from './AWSEMRClusterType';
import { SetupStepType } from './ComputeServiceType';

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
  description?: string;
  uuid: ComputeConnectionActionUUIDEnum;
}

export default interface ComputeConnectionType extends SetupStepType {
  actions: ComputeConnectionActionType[];
  attributes: {
    [key: string]: any;
  };
  connection: AWSEMRClusterType | SSHTunnelType;
  steps: SetupStepType[];
  uuid: ComputeConnectionUUIDEnum,
}
