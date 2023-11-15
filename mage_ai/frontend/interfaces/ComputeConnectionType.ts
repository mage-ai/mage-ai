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
