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
    uuid: 'repo_path'
  },
];

export const SYNC_FIELDS = [
  {
    autoComplete: 'branch',
    label: 'Branch name',
    uuid: 'branch',
  },
];
