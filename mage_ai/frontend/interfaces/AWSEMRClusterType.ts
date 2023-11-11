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
  cluster_arn: string;
  id: string;
  name: string;
  normalized_instance_hours: number;
  status: AWSEMRClusterStatusType;
}
