export interface InstanceType {
  ip: string;
  name: string;
  status: string;
  type?: string;
  task_arn?: string;
}

export enum WorkspaceQueryEnum {
  ALL = '__all__',
  NAMESPACE = 'namespace[]',
}

export default interface WorkspaceType {
  access?: number;
  cluster_type?: string;
  container_config?: any;
  ingress_name?: string;
  instance: InstanceType;
  lifecycle_config?: any;
  name: string;
  namespace?: string;
  project_uuid?: string;
  pvc_retention_policy?: string;
  service_account_name?: string;
  storage_access_mode?: string;
  storage_class_name?: string;
  storage_request_size?: string;
  repo_path?: string;
  url?: string;
}
