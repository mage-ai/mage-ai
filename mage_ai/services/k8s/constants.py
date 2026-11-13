import os

KUBE_POD_NAME_ENV_VAR = 'HOSTNAME'
KUBE_POD_NAMESPACE_ENV_VAR = 'KUBE_NAMESPACE'
# Name of the k8s Job that owns this block pod. Injected by JobManager, so its presence
# tells the block executor that it runs inside a block pod.
MAGE_K8S_JOB_NAME_ENV_VAR = 'MAGE_K8S_JOB_NAME'
# Exit code of a block pod whose block failed. The Job's podFailurePolicy fails the Job
# on it, so backoffLimit retries are spent on pod failures only (OOM, eviction...).
K8S_BLOCK_FAILED_EXIT_CODE = 3
KUBE_CONTAINER_NAME = os.getenv('MAGE_CONTAINER_NAME', '')
CONFIG_FILE = os.getenv('K8S_CONFIG_FILE', '')

DEFAULT_NAMESPACE = os.getenv(KUBE_POD_NAMESPACE_ENV_VAR, 'default')
DEFAULT_SERVICE_ACCOUNT_NAME = os.getenv('KUBE_SERVICE_ACCOUNT_NAME', 'default')
DEFAULT_STORAGE_CLASS_NAME = os.getenv('KUBE_STORAGE_CLASS_NAME', 'default')
