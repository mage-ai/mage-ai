import FileType from './FileType';

interface GitCommitType {
  author: {
    email?: string;
    name?: string;
  };
  date: string;
  message: string;
}

interface SyncConfigType {
 auth_type?: string;
 branch?: string;
 email?: string;
 remote_repo_link?: string;
 repo_path?: string;
 sync_on_pipeline_run?: boolean;
 type?: string;
 username?: string;
}

export interface GitRemoteType {
  name: string;
  refs: {
    commit: GitCommitType;
    name: string;
  }[];
  repository_names: string[];
  urls: string[];
};

export default interface GitBranchType {
  action_type?: string;
  error?: string;
  files?: FileType[];
  logs?: GitCommitType[];
  message?: string;
  modified_files?: string[];
  name: string;
  remotes?: GitRemoteType[];
  staged_files?: string[];
  status?: string;
  sync_config?: SyncConfigType;
  untracked_files?: string[];
}
