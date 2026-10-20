export interface PullRequestPayloadType {
  base_branch: string;
  body?: string;
  compare_branch: string;
  repository: string;
  title: string;
}

export default interface PullRequestType {
  body: string;
  created_at: string;
  id: number;
  is_merged: boolean;
  last_modified: string;
  merged: boolean;
  state: string;
  title: string;
  url: string;
  user: string;
}
