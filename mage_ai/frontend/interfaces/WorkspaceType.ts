export interface InstanceType {
  ip: string;
  name: string;
  status: string;
  type?: string;
  task_arn?: string;
}

export default interface WorkspaceType {
  name: string;
  instance: InstanceType;
}
