import FileType from './FileType';

export default interface GitBranchType {
  action_type?: string;
  files?: FileType[];
  message?: string;
  modified_files?: string[];
  name: string;
  staged_files?: string[];
  status?: string;
  untracked_files?: string[];
}
