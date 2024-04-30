import { TabType } from '@oracle/components/Tabs/ButtonTabs';

export const ACTION_CLONE = 'clone';
export const ACTION_DELETE = 'delete';
export const ACTION_FETCH = 'fetch';
export const ACTION_MERGE = 'merge';
export const ACTION_PULL = 'pull';
export const ACTION_PUSH = 'push';
export const ACTION_REBASE = 'rebase';
export const ACTION_RESET = 'reset';
export const ACTION_RESET_HARD = 'reset --hard';

export const ADDITIONAL_ARGUMENTS = {
  [ACTION_FETCH]: ['prune'],
};

export const LOCAL_STORAGE_GIT_REMOTE_NAME = 'git_remote_name';
export const LOCAL_STORAGE_GIT_REPOSITORY_NAME = 'git_repository_name';

export const TAB_BRANCHES = {
  uuid: 'Branches',
};
export const TAB_FILES = {
  uuid: 'Commit',
};
export const TAB_PUSH = {
  uuid: 'Push & Pull Requests',
};
export const TAB_REMOTE = {
  uuid: 'Remote & Auth',
};

export const TABS: TabType[] = [
  TAB_REMOTE,
  TAB_BRANCHES,
  TAB_FILES,
  TAB_PUSH,
];
