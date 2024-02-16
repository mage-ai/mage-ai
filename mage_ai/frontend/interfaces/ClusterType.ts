enum ClusterActionEnum {
  CREATE_NEW_CLUSTER = 'create_new_cluster',
  SET_ACTIVE_CLUSTER = 'set_active_cluster',
}

export enum ClusterStatusEnum {
  BOOTSTRAPPING = 'BOOTSTRAPPING',
  STARTING = 'STARTING',
  WAITING = 'WAITING',
}

export default interface ClusterType {
  action?: ClusterActionEnum;
  id: string;
  is_active?: boolean;
  name?: string;
  status?: ClusterStatusEnum;
}
