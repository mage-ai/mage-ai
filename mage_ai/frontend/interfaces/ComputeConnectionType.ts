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
  steps: SetupStepType[];
  tags: {
    [key: string]: any;
  };
  target: AWSEMRClusterType | SSHTunnelType;
  uuid: ComputeConnectionUUIDEnum,
}
