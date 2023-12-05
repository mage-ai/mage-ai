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

export enum SetupStepUUIDEnum {
  ACTIVATE_CLUSTER = 'activate_cluster',
  AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY',
  CLUSTER_CONNECTION = 'cluster_connection',
  CONFIGURE = 'configure',
  CREDENTIALS = 'credentials',
  EC2_KEY_NAME = 'ec2_key_name',
  EC2_KEY_PAIR = 'ec2_key_pair',
  EC2_KEY_PATH = 'ec2_key_path',
  IAM_PROFILE = 'iam_instance_profile',
  LAUNCH_CLUSTER = 'launch_cluster',
  OBSERVABILITY = 'observability',
  PERMISSIONS = 'permissions',
  PERMISSIONS_SSH = 'permissions_ssh',
  REMOTE_VARIABLES_DIR = 'remote_variables_dir',
  SETUP = 'setup',
};

export interface ErrorMessageType {
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
  uuid: SetupStepUUIDEnum;
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
