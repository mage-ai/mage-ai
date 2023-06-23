import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Branches from './Branches';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Commit from './Commit';
import Dashboard from '@components/Dashboard';
import Divider from '@oracle/elements/Divider';
import FileBrowser from '@components/FileBrowser';
import FileType from '@interfaces/FileType';
import GitBranchType from '@interfaces/GitBranchType';
import GitFileType from '@interfaces/GitFileType';
import GitFiles from './GitFiles';
import Remote from './Remote';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import {
  DIFF_STYLES,
  DiffContainerStyle,
} from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import {
  TABS,
  TAB_BRANCHES,
  TAB_COMMIT,
  TAB_FILES,
  TAB_REMOTE,
} from './constants';
import { getFullPath } from '@components/FileBrowser/utils';
import { goToWithQuery } from '@utils/routing';
import { isEmptyObject } from '@utils/hash';
import { queryFromUrl } from '@utils/url';
import { useError } from '@context/Error';

function VersionControl() {
  const fileTreeRef = useRef(null);
  const refSelectBaseBranch = useRef(null);

  const [showError] = useError(null, {}, [], {
    uuid: 'VersionControlPage',
  });

  const [branchBase, setBranchBase] = useState<string>(null);
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

  const {
    data: dataBranchRemotes,
    mutate: fetchBranchRemotes,
  } = api.git_branches.detail('with_remotes', {
    '_format': 'with_remotes',
  });
  const branchGit = useMemo(() => dataBranchRemotes?.git_branch, [dataBranchRemotes]);
  const remotes = useMemo(() => branchGit?.remotes || [], [branchGit]);

  const { data: dataFile, mutate: fetchFileGit } = api.git_files.detail(
    selectedFilePath
      ? encodeURIComponent(selectedFilePath)
      : null,
    {
      base_branch: branchBase,
    });
  const fileGit: GitFileType = useMemo(() => dataFile?.git_file, [dataFile]);

  useEffect(() => {
    if (branchBase) {
      fetchFileGit();
    }
  }, [branchBase, fetchFileGit]);

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

  useEffect(() => {
    if (selectedFilePath
      && isEmptyObject(modifiedFiles)
      && isEmptyObject(stagedFiles)
      && isEmptyObject(untrackedFiles)
    ) {
      setSelectedFilePath(null);
    }
  }, [
    modifiedFiles,
    selectedFilePath,
    stagedFiles,
    untrackedFiles,
  ]);

  const fileBrowserMemo = useMemo(() => {
    if (files?.length >= 1) {
      return (
        <FileBrowser
          allowEmptyFolders
          disableContextMenu
          fetchFileTree={fetchBranch}
          files={files}
          isFileDisabled={() => false}
          onClickFile={(path: string) => {
            // @ts-ignore
            setSelectedFilePath((prev) => {
              if (!prev || prev !== path) {
                if (!branchBase) {
                  refSelectBaseBranch?.current?.focus();
                }

                return path;
              }

              return null;
            });
          }}
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
      );
    }

    return (
      <Spacing p={PADDING_UNITS}>
        <Text monospace muted>
          No files modified
        </Text>
      </Spacing>
    );
  }, [
    branchBase,
    fetchBranch,
    fileTreeRef,
    files,
    modifiedFiles,
    refSelectBaseBranch,
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
        {!branchBase && (
          <Spacing p={PADDING_UNITS}>
            <Text muted>
              Please select a base branch to see the file diffs.
            </Text>
          </Spacing>
        )}

        {fileGit?.error && (
          <Spacing p={PADDING_UNITS}>
            <Text
              danger
              monospace
              preWrap
            >
              {fileGit?.error}
            </Text>
          </Spacing>
        )}

        {branchBase && !fileGit?.error && (
          <>
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
          </>
        )}
      </DiffContainerStyle>
    );
  }, [
    branchBase,
    fileGit,
    isLoadingGitFile,
    selectedFilePath,
  ]);

  const mainContainerHeaderMemo = useMemo(() => (
    <>
      <div
        style={{
          marginBottom: UNIT * 0.5,
          marginTop: UNIT * 0.5,
        }}
      >
        <ButtonTabs
          compact
          onClickTab={({ uuid }) => {
            goToWithQuery({ tab: uuid });
          }}
          selectedTabUUID={selectedTab?.uuid}
          tabs={TABS}
        />
      </div>
      <Divider light />
    </>
  ), [selectedTab]);

  const remoteMemo = useMemo(() => (
    <Remote
      branch={branch}
      fetchBranch={fetchBranchRemotes}
      loading={!dataBranchRemotes}
      remotes={remotes}
      showError={showError}
    />
  ), [
    branch,
    dataBranchRemotes,
    fetchBranchRemotes,
    remotes,
    showError,
  ]);

  const branchesMemo = useMemo(() => (
    <Branches
      branch={branch}
      branches={branches}
      fetchBranch={fetchBranch}
      fetchBranches={fetchBranches}
      showError={showError}
    />
  ), [
    branch,
    branches,
    fetchBranch,
    fetchBranches,
    showError,
  ]);

  const filesMemo = useMemo(() => (
    <GitFiles
      branch={branch}
      fetchBranch={fetchBranch}
      modifiedFiles={modifiedFiles}
      setSelectedFilePath={setSelectedFilePath}
      showError={showError}
      stagedFiles={stagedFiles}
      untrackedFiles={untrackedFiles}
    />
  ), [
    branch,
    fetchBranch,
    modifiedFiles,
    setSelectedFilePath,
    showError,
    stagedFiles,
    untrackedFiles,
  ]);

  const commitMemo = useMemo(() => (
    <Commit
      branch={branch}
      branches={branches}
      fetchBranch={fetchBranch}
      loading={!dataBranchRemotes}
      modifiedFiles={modifiedFiles}
      remotes={remotes}
      showError={showError}
      stagedFiles={stagedFiles}
    />
  ), [
    branch,
    branches,
    dataBranchRemotes,
    fetchBranch,
    modifiedFiles,
    remotes,
    showError,
    stagedFiles,
  ]);

  return (
    <Dashboard
      after={fileDiffMemo}
      afterHidden={!selectedFilePath}
      before={(
        <>
          <Spacing p={1}>
            <Select
              compact
              label="Base branch"
              onChange={e => setBranchBase(e.target.value)}
              ref={refSelectBaseBranch}
              small
              value={branchBase || ''}
            >
              {branches?.map(({ name }) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          </Spacing>

          {fileBrowserMemo}
        </>
      )}
      mainContainerHeader={mainContainerHeaderMemo}
      title="Version control"
      uuid="Version control/index"
    >
      <Spacing p={PADDING_UNITS}>
        {!dataBranch && <Spinner inverted />}
        {dataBranch && (
          <>
            {TAB_REMOTE.uuid === selectedTab?.uuid && remoteMemo}

            {TAB_BRANCHES.uuid === selectedTab?.uuid && branchesMemo}

            {TAB_FILES.uuid === selectedTab?.uuid && filesMemo}

            {TAB_COMMIT.uuid === selectedTab?.uuid && commitMemo}
          </>
        )}
      </Spacing>
    </Dashboard>
  );
}

export default VersionControl;
