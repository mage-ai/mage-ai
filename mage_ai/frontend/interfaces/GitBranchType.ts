import FileType from './FileType';

export default interface GitBranchType {
  action_type?: string;
  files?: FileType[];
  logs?: {
    author: {
      email?: string;
      name?: string;
    };
    date: string;
    message: string;
  };
  message?: string;
  modified_files?: string[];
  name: string;
  staged_files?: string[];
  status?: string;
  untracked_files?: string[];
}
