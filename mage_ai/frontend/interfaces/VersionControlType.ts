export interface VersionControlBranch {
  name: string;
}

export interface VersionControlCommit {
  message: string;
  sha: string;
}

export interface VersionControlProject {
  uuid: string;
}

export interface VersionControlRemote {
  name: string;
  url?: string;
}
