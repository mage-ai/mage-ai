export enum ExecutorTypeEnum {
  AZURE_CONTAINER_INSTANCE = 'azure_container_instance',
  ECS = 'ecs',
  GCP_CLOUD_RUN = 'gcp_cloud_run',
  K8S = 'k8s',
  LOCAL_PYTHON = 'local_python',
  PYSPARK = 'pyspark',
}

export const EXECUTOR_TYPES = [
  ExecutorTypeEnum.AZURE_CONTAINER_INSTANCE,
  ExecutorTypeEnum.ECS,
  ExecutorTypeEnum.GCP_CLOUD_RUN,
  ExecutorTypeEnum.K8S,
  ExecutorTypeEnum.LOCAL_PYTHON,
  ExecutorTypeEnum.PYSPARK,
];
