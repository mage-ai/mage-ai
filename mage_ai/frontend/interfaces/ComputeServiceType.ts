import AWSEMRClusterType, { AWSEMRMetadataType } from './AWSEMRClusterType';

export enum ComputeServiceUUIDEnum {
  AWS_EMR = 'AWS_EMR',
  STANDALONE_CLUSTER = 'STANDALONE_CLUSTER',
};

export enum SetupStepStatusEnum {
  COMPLETED = 'completed',
  ERROR = 'error',
  INCOMPLETE = 'incomplete',
};

interface ErrorMessageType {
  message: string;
  variables?: {
    [key: string]: {
      monospace?: boolean;
    };
  };
}

export interface ConnectionCredentialType {
  description?: string;
  error: ErrorMessageType;
  name?: string;
  required?: boolean;
  valid?: boolean;
  value?: string;
  uuid: string;
}

export interface SetupStepType {
  name: string;
  description?: string;
  group?: boolean;
  error?: ErrorMessageType;
  required?: boolean;
  status?: SetupStepStatusEnum;
  status_calculated?: SetupStepStatusEnum;
  steps?: SetupStepType[];
  tab?: string;
  uuid: string;
}

export default interface ComputeServiceType {
  connection_credentials: ConnectionCredentialType[];
  clusters?: {
    clusters: AWSEMRClusterType[];
    metadata?: AWSEMRMetadataType;
  };
  setup_steps: SetupStepType[];
  uuid: ComputeServiceUUIDEnum;
}
