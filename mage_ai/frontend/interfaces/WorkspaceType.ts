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
  instance: InstanceType;
  name: string;
  project_uuid?: string;
  repo_path?: string;
  url?: string;
}
