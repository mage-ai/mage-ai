export default interface SyncType {
  type?: string;
  remote_repo_link?: string;
  repo_path?: string;
  branch?: string;
  sync_on_pipeline_run?: boolean;
};

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
    uuid: 'repo_path'
  },
];

export const OPTIONAL_GIT_FIELDS = [
  {
    autoComplete: 'username',
    label: 'Username',
    uuid: 'username'
  },
  {
    autoComplete: 'email',
    label: 'Email',
    uuid: 'email'
  },
  {
    autoComplete: 'ssh_public_key',
    label: 'SSH public key in base64',
    labelDescription: 'Run "cat ~/.ssh/id_rsa.pub | base64 | tr -d \\\\n" in terminal to get base64 encoded public key and paste the result here. The public key will be stored as a Mage secret named "mage_git_ssh_public_key_b64".',
    type: 'password',
    uuid: 'ssh_public_key',
  },
  {
    autoComplete: 'ssh_private_key',
    label: 'SSH private key in base64',
    labelDescription: 'Follow same steps as the public key, but run "cat ~/.ssh/id_rsa | base64 | tr -d \\\\n" instead. The private key will be stored as a Mage secret named "mage_git_ssh_private_key_b64".',
    type: 'password',
    uuid: 'ssh_private_key',
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
