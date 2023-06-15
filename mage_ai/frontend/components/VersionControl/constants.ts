import { TabType } from '@oracle/components/Tabs/ButtonTabs';

export const ACTION_MERGE = 'merge';
export const ACTION_PULL = 'pull';
export const ACTION_REBASE = 'rebase';

export const TAB_BRANCHES = {
  uuid: 'Branches',
};
export const TAB_FILES = {
  uuid: 'Files',
};
export const TAB_COMMIT = {
  uuid: 'Commit',
};
export const TAB_REMOTE = {
  uuid: 'Remote',
};

export const TABS: TabType[] = [
  TAB_REMOTE,
  TAB_BRANCHES,
  TAB_FILES,
  TAB_COMMIT,
];
