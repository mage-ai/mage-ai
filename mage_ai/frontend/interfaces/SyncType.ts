export enum AuthType {
  SSH = 'ssh',
  HTTPS = 'https',
}

export interface UserGitSettingsType {
  username?: string;
  email?: string;
}

export default interface SyncType {
  type?: string;
  auth_type?: AuthType;
  remote_repo_link?: string;
  repo_path?: string;
  branch?: string;
  sync_on_pipeline_run?: boolean;
  sync_on_start?: boolean;
  sync_submodules?: boolean;
  user_git_settings?: UserGitSettingsType;
}

export const GIT_FIELDS = [
  {
    autoComplete: 'remote_repo_link',
    label: 'Remote repo url',
    required: true,
    uuid: 'remote_repo_link',
  },
  {
    autoComplete: 'repo_path',
    label: 'Local directory path',
    labelDescription: "Defaults to Python's os.getcwd() if omitted. Mage will create this local directory if it doesn't already exist.",
    uuid: 'repo_path',
  },
];

export const SSH_GIT_FIELDS = [
  {
    autoComplete: 'username',
    label: 'Username',
    uuid: 'username',
  },
  {
    autoComplete: 'email',
    label: 'Email',
    uuid: 'email',
  },
  {
    autoComplete: 'ssh_public_key',
    label: 'SSH public key in base64',
    type: 'password',
    uuid: 'ssh_public_key',
  },
  {
    autoComplete: 'ssh_private_key',
    label: 'SSH private key in base64',
    type: 'password',
    uuid: 'ssh_private_key',
  },
];

export const HTTPS_GIT_FIELDS = [
  {
    autoComplete: 'username',
    label: 'Username',
    required: true,
    uuid: 'username',
  },
  {
    autoComplete: 'email',
    label: 'Email',
    required: true,
    uuid: 'email',
  },
  {
    autoComplete: 'access_token',
    label: 'Access token',
    labelDescription: 'Add your Git access token to authenticate with your provided username. The access token will be stored as a Mage secret. You will see the secret below if you have already added it.',
    required: true,
    type: 'password',
    uuid: 'access_token',
  },
];

export const SYNC_FIELDS = [
  {
    autoComplete: 'branch',
    label: 'Branch name',
    required: true,
    uuid: 'branch',
  },
];
