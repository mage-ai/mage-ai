export const ACCESS_MODE_READ_WRITE_ONCE = 'ReadWriteOnce';
export const ACCESS_MODE_READ_WRITE_MANY = 'ReadWriteMany';
export const ACCESS_MODE_READ_ONLY_MANY = 'ReadOnlyMany';


export const ACCESS_MODES = [
  ACCESS_MODE_READ_WRITE_ONCE,
  ACCESS_MODE_READ_WRITE_MANY,
  ACCESS_MODE_READ_ONLY_MANY,
];

export const PVC_RETENTION_OPTIONS = [
  'Retain',
  'Delete',
];

export const WORKSPACE_FIELDS = [
  {
    label: 'Workspace name',
    required: true,
    uuid: 'name',
  },
];

export const GENERAL_K8S_FIELDS = [
  {
    label: 'Namespace',
    labelDescription: 'The namespace where the workspace resources will be deployed. Defaults to the value of the KUBE_NAMESPACE environment variable.',
    uuid: 'namespace',
  },
  {
    label: 'Service account name',
    placeholder: 'default',
    uuid: 'service_account_name',
  },
  {
    label: 'Ingress name',
    labelDescription: 'If you want to add the workspace to an existing ingress, enter the name of the ingress here. Otherwise, the workspace can be accessed through the service.',
    placeholder: 'my-ingress',
    uuid: 'ingress_name',
  },
];

export const VOLUME_CLAIM_K8S_FIELDS = [
  {
    label: 'Storage class name',
    placeholder: 'default',
    uuid: 'storage_class_name',
  },
  {
    label: 'Storage request size (in GB)',
    type: 'number' ,
    uuid: 'storage_request_size',
  },
];

export interface WorkspaceFieldType {
  autoComplete?: string;
  disabled?: boolean;
  label: string;
  labelDescription?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  uuid: string;
}
