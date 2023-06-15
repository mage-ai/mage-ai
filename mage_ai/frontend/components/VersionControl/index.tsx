import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer';
import { useEffect, useMemo, useRef, useState } from 'react';

import Branches from './Branches';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Commit from './Commit';
import Dashboard from '@components/Dashboard';
import FileBrowser from '@components/FileBrowser';
import FileType from '@interfaces/FileType';
import GitBranchType from '@interfaces/GitBranchType';
import GitFileType from '@interfaces/GitFileType';
import GitFiles from './GitFiles';
import Remote from './Remote';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import {
  DIFF_STYLES,
  DiffContainerStyle,
} from './index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  TABS,
  TAB_BRANCHES,
  TAB_COMMIT,
  TAB_FILES,
  TAB_REMOTE,
} from './constants';
import { getFullPath } from '@components/FileBrowser/utils';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl } from '@utils/url';
import { useError } from '@context/Error';

function VersionControl() {
  const fileTreeRef = useRef(null);

  const [showError] = useError(null, {}, [], {
    uuid: 'VersionControlPage',
  });

  const [branchBase, setBranchBase] = useState<string>('td--version_control');
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>(TABS[0]);

  const q: { tab?: string } = queryFromUrl();
  useEffect(() => {
    if (q?.tab) {
      setSelectedTab(TABS.find(({ uuid }) => uuid === q?.tab));
    }
  }, [q]);

  const { data: dataBranches, mutate: fetchBranches } = api.git_branches.list();
  const branches: GitBranchType[] = useMemo(() => dataBranches?.git_branches, [dataBranches]);

  const { data: dataBranch, mutate: fetchBranch } = api.git_branches.detail('current');
  const branch: GitBranchType = useMemo(() => dataBranch?.git_branch || {}, [dataBranch]);
  const files: FileType[] = useMemo(() => branch?.files || [], [branch]);

  const { data: dataFile, mutate: fetchFileGit } = api.git_files.detail(
    selectedFilePath
      ? encodeURIComponent(selectedFilePath)
      : null,
    {
      base_branch: branchBase,
    });
  const fileGit: GitFileType = useMemo(() => dataFile?.git_file, [dataFile]);

  useEffect(() => {
    if (dataFile?.error) {
      showError({
        errors: dataFile?.error,
        response: dataFile,
      });
    }
  }, [dataFile, showError]);

  const {
    modifiedFiles = {},
    stagedFiles = {},
    untrackedFiles = {},
  }: {
    modifiedFiles: {
      [fullPath: string]: boolean;
    };
    stagedFiles: {
      [fullPath: string]: boolean;
    };
    untrackedFiles: {
      [fullPath: string]: boolean;
    };
  } = useMemo(() => ({
    modifiedFiles: branch?.modified_files?.reduce((acc, fullPath) => ({
      ...acc,
      [fullPath]: true,
    }), {}),
    stagedFiles: branch?.staged_files?.reduce((acc, fullPath) => ({
      ...acc,
      [fullPath]: true,
    }), {}),
    untrackedFiles: branch?.untracked_files?.reduce((acc, fullPath) => ({
      ...acc,
      [fullPath]: true,
    }), {}),
  }), [branch]);

  const fileBrowserMemo = useMemo(() => (
    <FileBrowser
      allowEmptyFolders
      disableContextMenu
      fetchFileTree={fetchBranch}
      files={files}
      isFileDisabled={() => false}
      onClickFile={(path: string) => setSelectedFilePath(prev => !prev || prev !== path
        ? path
        : null,
      )}
      ref={fileTreeRef}
      renderAfterContent={(file: FileType) => {
        const {
          children,
        } = file;
        const isFolder = children?.length >= 1;

        let fullPath = getFullPath(file);
        // When a folder is untracked, it has a / at the end.
        // e.g. default_repo/transformers/
        if (isFolder) {
          fullPath = `${fullPath}/`;
        }
        let displayText;
        let displayTitle;
        const colorProps: {
          danger?: boolean;
          success?: boolean;
          warning?: boolean;
        } = {};

        if (modifiedFiles?.[fullPath]) {
          displayText = 'M';
          displayTitle = 'Modified';
          colorProps.warning = true;
        } else if (untrackedFiles?.[fullPath]) {
          displayText = 'U';
          displayTitle = 'Untracked';
          colorProps.danger = true;
        } else if (stagedFiles?.[fullPath]) {
          displayText = 'S';
          displayTitle = 'Staged';
          colorProps.success = true;
        }

        if (isFolder && !displayText) {
          return null;
        }

        return (
          <Spacing mx={1}>
            <Tooltip
              appearBefore
              label={displayTitle}
              widthFitContent
            >
              <Text
                {...colorProps}
                monospace
                rightAligned
                small
              >
                {displayText}
              </Text>
            </Tooltip>
          </Spacing>
        );
      }}
      useRootFolder
    />
  ), [
    fetchBranch,
    fileTreeRef,
    files,
    modifiedFiles,
    setSelectedFilePath,
    stagedFiles,
    untrackedFiles,
  ]);

  const isLoadingGitFile =
    useMemo(() => !dataFile || !fileGit || (selectedFilePath && fileGit?.filename !== selectedFilePath), [
      dataFile,
      fileGit,
      selectedFilePath,
    ]);

  const fileDiffMemo = useMemo(() => {
    if (!selectedFilePath) {
      return null;
    }

    const {
      content,
      content_from_base: contentFromBase,
    } = fileGit || {};

    return (
      <DiffContainerStyle>
        {isLoadingGitFile && (
          <Spacing p={PADDING_UNITS}>
            <Spinner inverted />
          </Spacing>
        )}
        {!isLoadingGitFile && (
          <ReactDiffViewer
            compareMethod={DiffMethod.WORDS}
            newValue={content || ''}
            oldValue={contentFromBase || ''}
            renderContent={(str) => <Text monospace>{str}</Text>}
            splitView={true}
            styles={DIFF_STYLES}
            useDarkTheme
          />
        )}
      </DiffContainerStyle>
    );
  }, [
    fileGit,
    isLoadingGitFile,
    selectedFilePath,
  ]);

  const mainContainerHeaderMemo = useMemo(() => (
    <Spacing mt={1}>
      <ButtonTabs
        onClickTab={({ uuid }) => {
          goToWithQuery({ tab: uuid });
        }}
        selectedTabUUID={selectedTab?.uuid}
        tabs={TABS}
      />
    </Spacing>
  ), [selectedTab]);

  return (
    <Dashboard
      // TODO (tommy dang): when we’re ready to show diffs, uncomment the below code.
      after={fileDiffMemo}
      afterHidden={!selectedFilePath}
      // afterHidden
      before={fileBrowserMemo}
      // headerOffset={MAIN_CONTENT_TOP_OFFSET}
      mainContainerHeader={mainContainerHeaderMemo}
      title="Version control"
      uuid="Version control/index"
    >
      <Spacing p={PADDING_UNITS}>
        {!dataBranch && <Spinner inverted />}
        {dataBranch && (
          <>
            {TAB_REMOTE.uuid === selectedTab?.uuid && (
              <Remote
                branch={branch}
                showError={showError}
              />
            )}

            {TAB_BRANCHES.uuid === selectedTab?.uuid && (
              <Branches
                branch={branch}
                branches={branches}
                fetchBranch={fetchBranch}
                fetchBranches={fetchBranches}
                showError={showError}
              />
            )}

            {TAB_FILES.uuid === selectedTab?.uuid && (
              <GitFiles
                branch={branch}
                fetchBranch={fetchBranch}
                modifiedFiles={modifiedFiles}
                showError={showError}
                stagedFiles={stagedFiles}
                untrackedFiles={untrackedFiles}
              />
            )}

            {TAB_COMMIT.uuid === selectedTab?.uuid && (
              <Commit
                branch={branch}
                fetchBranch={fetchBranch}
                modifiedFiles={modifiedFiles}
                showError={showError}
                stagedFiles={stagedFiles}
              />
            )}
          </>
        )}
      </Spacing>
    </Dashboard>
  );
}

export default VersionControl;
