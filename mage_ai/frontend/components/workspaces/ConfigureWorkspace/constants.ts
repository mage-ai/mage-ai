export const ACCESS_MODE_READ_WRITE_ONCE = 'ReadWriteOnce';
export const ACCESS_MODE_READ_WRITE_MANY = 'ReadWriteMany';
export const ACCESS_MODE_READ_ONLY_MANY = 'ReadOnlyMany';


export const ACCESS_MODES = [
  ACCESS_MODE_READ_WRITE_ONCE,
  ACCESS_MODE_READ_WRITE_MANY,
  ACCESS_MODE_READ_ONLY_MANY,
];

export const WORKSPACE_FIELDS = [
  {
    label: 'Workspace name',
    required: true,
    uuid: 'name',
  },
];

export const K8S_TEXT_FIELDS = [
  {
    label: 'Service account name',
    uuid: 'service_account_name',
  },
  {
    label: 'Ingress name',
    labelDescription: 'If you want to add the workspace to an existing ingress, enter the name of the ingress here. Otherwise, the workspace can be accessed through the service.',
    uuid: 'ingress_name',
  },
  {
    label: 'Storage class name',
    labelDescription: 'Volume claim parameters',
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
  required?: boolean;
  type?: string;
  uuid: string;
}
