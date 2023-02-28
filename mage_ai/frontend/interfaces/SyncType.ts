export default interface SyncType {
  type?: string;
  remote_repo_link?: string;
  repo_path?: string;
  branch?: string;
  sync_on_pipeline_run?: boolean;
};

export enum SyncTypeEnum {
  GIT = 'git',
}

export const SYNC_FIELDS = {
  [SyncTypeEnum.GIT]: [
    {
      autoComplete: 'remote_repo_link',
      label: 'Remote repo url',
      required: true,
      uuid: 'remote_repo_link',
    },
    {
      autoComplete: 'branch',
      label: 'Branch name',
      required: true,
      uuid: 'branch',
    },
    {
      autoComplete: 'repo_path',
      label: 'Local directory path',
      uuid: 'repo_path'
    }
  ],
};
