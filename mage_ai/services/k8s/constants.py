import os

KUBE_POD_NAME_ENV_VAR = 'HOSTNAME'
KUBE_POD_NAMESPACE_ENV_VAR = 'KUBE_NAMESPACE'
# Name of the k8s Job that owns this block pod. Injected by JobManager so that the
# in-pod block executor can tell whether backoffLimit retries are still pending.
MAGE_K8S_JOB_NAME_ENV_VAR = 'MAGE_K8S_JOB_NAME'
# Recorded on a FAILED block run when its Job still has backoffLimit attempts left,
# so the scheduler can hold off failing the pipeline run without querying Kubernetes.
K8S_RETRY_PENDING_METRIC_KEY = 'k8s_retry_pending'
KUBE_CONTAINER_NAME = os.getenv('MAGE_CONTAINER_NAME', '')
CONFIG_FILE = os.getenv('K8S_CONFIG_FILE', '')

DEFAULT_NAMESPACE = os.getenv(KUBE_POD_NAMESPACE_ENV_VAR, 'default')
DEFAULT_SERVICE_ACCOUNT_NAME = os.getenv('KUBE_SERVICE_ACCOUNT_NAME', 'default')
DEFAULT_STORAGE_CLASS_NAME = os.getenv('KUBE_STORAGE_CLASS_NAME', 'default')
