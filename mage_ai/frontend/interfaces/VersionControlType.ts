export interface VersionControlBranch {
  name: string;
}

export interface VersionControlCommit {
  message: string;
  sha: string;
}

export interface VersionControlFileType {
  additions?: number
  content?: string;
  deletions?: number;
  diff?: string[];
  file_path?: string;
  name: string;
  output?: string[];
  project_uuid?: string;
  repo_path?: string;
  staged?: boolean;
  unstaged?: boolean;
  untracked?: boolean;
}

export interface VersionControlProject {
  uuid: string;
}

export interface VersionControlRemote {
  name: string;
  url?: string;
}
