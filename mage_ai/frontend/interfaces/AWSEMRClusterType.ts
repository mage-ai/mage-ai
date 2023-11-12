export enum ClusterStatusStateEnum {
  BOOTSTRAPPING = 'BOOTSTRAPPING',
  RUNNING = 'RUNNING',
  STARTING = 'STARTING',
  TERMINATED = 'TERMINATED',
  TERMINATED_WITH_ERRORS = 'TERMINATED_WITH_ERRORS',
  TERMINATING = 'TERMINATING',
  WAITING = 'WAITING',
}

interface ErrorDetailsType {
  error_code: string;
  error_data?: {
    [key: string]: string
  }[];
  error_message: string;
}

interface AWSEMRClusterStatusTimelineType {
  creation_date_time: string;
  end_date_time?: string;
  ready_date_time?: string;
}

interface StateChangeReasonType {
  code?: string;
  message: string;
}

interface AWSEMRClusterStatusType {
  error_details?: ErrorDetailsType;
  state: ClusterStatusStateEnum;
  state_change_reason: StateChangeReasonType;
  timeline: AWSEMRClusterStatusTimelineType;
}

export interface AWSEMRMetadataType {
  http_headers: {
    [key: string]: string;
  };
  http_status_code: number;
  request_id: string;
  retry_attempts: number;
}

export default interface AWSEMRClusterType {
  active?: boolean;
  applications?: {
    name: string;
    version: string;
  }[];
  auto_terminate?: boolean;
  cluster_arn: string;
  ebs_root_volume_size?: number;
  id: string;
  name: string;
  normalized_instance_hours: number;
  ready: boolean;
  release_label?: string;
  scale_down_behavior?: string;
  service_role?: string;
  status: AWSEMRClusterStatusType;
  step_concurrency_level?: number;
  tags?: {
    key: string;
    value: string;
  }[];
  termination_protected?: boolean;
  visible_to_all_users?: boolean;
}
