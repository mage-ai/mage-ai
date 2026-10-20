export enum ClusterTypeEnum {
  K8S = 'k8s',
  ECS = 'ecs',
  CLOUD_RUN = 'cloud_run',
  EMR = 'emr',
}

export const KUBERNETES_FIELDS = {
  'ingress_name': 'Ingress',
  'namespace': 'Namespace',
  'pvc_retention_policy': 'PVC retention policy',
  'service_account_name': 'Service account name',
  'storage_access_mode': 'Storage access mode',
  'storage_class_name': 'Storage class name',
  'storage_request_size': 'Storage request size (in GB)',
  'url': 'Access URL',
};

export const LIFECYCLE_FIELDS = {
  'termination_policy.enable_auto_termination': 'Termination policy: auto-terminate',
  'termination_policy.max_idle_seconds': 'Termination policy: max idle seconds',
  'pre_start_script_path': 'Pre start: script path',
  'post_start.command': 'Post start: command',
  'post_start.hook_path': 'Post start: path to hook',
};
