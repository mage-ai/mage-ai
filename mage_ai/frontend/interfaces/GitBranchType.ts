import FileType from './FileType';

interface GitCommitType {
  author: {
    email?: string;
    name?: string;
  };
  date: string;
  message: string;
}

export default interface GitBranchType {
  action_type?: string;
  files?: FileType[];
  logs?: GitCommitType[];
  message?: string;
  modified_files?: string[];
  name: string;
  remotes?: {
    name: string;
    refs: {
      commit: GitCommitType;
      name: string;
    };
    urls: string[];
  }[];
  staged_files?: string[];
  status?: string;
  untracked_files?: string[];
}
