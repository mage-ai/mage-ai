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
import {
  LOCAL_STORAGE_GIT_REMOTE_NAME,
  LOCAL_STORAGE_GIT_REPOSITORY_NAME,
  TABS,
  TAB_BRANCHES,
  TAB_PUSH,
  TAB_FILES,
  TAB_REMOTE,
} from './constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { get, set } from '@storage/localStorage';
import { getFullPath } from '@components/FileBrowser/utils';
import { goToWithQuery } from '@utils/routing';
import { isEmptyObject } from '@utils/hash';
import { queryFromUrl } from '@utils/url';
import { unique } from '@utils/array';
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

  const { data: dataBranches, mutate: fetchBranches } = api.git_custom_branches.list({
    include_remote_branches: 1,
  });
  const branches: GitBranchType[] = useMemo(() => dataBranches?.git_custom_branches, [dataBranches]);

  const { data: dataBranch, mutate: fetchBranch } = api.git_custom_branches.detail('current', {
    _format: 'with_files',
  });
  const branch: GitBranchType = useMemo(() => dataBranch?.git_custom_branch || {}, [dataBranch]);
  const files: FileType[] = useMemo(() => branch?.files || [], [branch]);

  const {
    data: dataBranchRemotes,
    mutate: fetchBranchRemotes,
  } = api.git_custom_branches.detail('with_remotes', {
    '_format': 'with_remotes',
  });
  const branchGit = useMemo(() => dataBranchRemotes?.git_custom_branch, [dataBranchRemotes]);
  const remotes = useMemo(() => branchGit?.remotes || [], [branchGit]);

  const [actionRemoteName, setActionRemoteNameState] = useState<string>(null);
  const setActionRemoteName = useCallback((value: string) => {
    set(LOCAL_STORAGE_GIT_REMOTE_NAME, value);
    setActionRemoteNameState(value);
  }, []);

  useEffect(() => {
    const nameLS = get(LOCAL_STORAGE_GIT_REMOTE_NAME, null);
    if (dataBranchRemotes && nameLS) {
      const obj = remotes?.find(({ name }) => name === nameLS);
      if (obj) {
        setActionRemoteName(obj?.name);
      } else {
        setActionRemoteName(null);
      }
    }
  }, [
    dataBranchRemotes,
    remotes,
    setActionRemoteName,
  ]);

  const [repositoryName, setRepositoryNameState] =
    useState<string>(get(LOCAL_STORAGE_GIT_REPOSITORY_NAME, ''));
  const setRepositoryName = useCallback((value: string) => {
    set(LOCAL_STORAGE_GIT_REPOSITORY_NAME, value);
    setRepositoryNameState(value);
  }, []);

  const repositories: {
    name: string;
    url: string;
  }[] =
    useMemo(
      () => unique(
        remotes.reduce((acc, remote) => acc.concat(remote?.repository_names?.map(name => ({
          name,
          url: remote?.urls?.[0],
        })) || []), []),
        ({ name }) => name,
      ),
      [remotes],
  );

  useEffect(() => {
    const nameLS = get(LOCAL_STORAGE_GIT_REPOSITORY_NAME, null);
    if (dataBranchRemotes && nameLS) {
      const obj = repositories?.find(({ name }) => name === nameLS);
      if (obj) {
        setRepositoryName(obj?.name);
      } else {
        setRepositoryName(null);
      }
    }
  }, [
    dataBranchRemotes,
    repositories,
    setRepositoryName,
  ]);

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

  const tabsToUse = useMemo(() => dataBranch && branch?.name ? TABS : TABS.slice(0, 1), [
    branch,
    dataBranch,
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
          tabs={tabsToUse}
        />
      </div>
      <Divider light />
    </>
  ), [selectedTab, tabsToUse]);

  const remoteMemo = useMemo(() => (
    <Remote
      actionRemoteName={actionRemoteName}
      branch={branch}
      fetchBranch={() => {
        fetchBranch();
        fetchBranchRemotes();
      }}
      loading={!dataBranchRemotes}
      remotes={remotes}
      setActionRemoteName={setActionRemoteName}
      showError={showError}
    />
  ), [
    actionRemoteName,
    branch,
    dataBranchRemotes,
    fetchBranch,
    fetchBranchRemotes,
    remotes,
    setActionRemoteName,
    showError,
  ]);

  const branchesMemo = useMemo(() => (
    <Branches
      actionRemoteName={actionRemoteName}
      branch={branch}
      branches={branches}
      fetchBranch={fetchBranch}
      fetchBranches={fetchBranches}
      remotes={remotes}
      setActionRemoteName={setActionRemoteName}
      showError={showError}
    />
  ), [
    actionRemoteName,
    branch,
    branches,
    fetchBranch,
    fetchBranches,
    remotes,
    setActionRemoteName,
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
      actionRemoteName={actionRemoteName}
      branch={branch}
      branches={branches}
      fetchBranch={fetchBranch}
      loading={!dataBranchRemotes}
      modifiedFiles={modifiedFiles}
      remotes={remotes}
      repositories={repositories}
      repositoryName={repositoryName}
      setActionRemoteName={setActionRemoteName}
      setRepositoryName={setRepositoryName}
      showError={showError}
      stagedFiles={stagedFiles}
    />
  ), [
    actionRemoteName,
    branch,
    branches,
    dataBranchRemotes,
    fetchBranch,
    modifiedFiles,
    remotes,
    repositories,
    repositoryName,
    setActionRemoteName,
    setRepositoryName,
    showError,
    stagedFiles,
  ]);

  return (
    <Dashboard
      after={fileDiffMemo}
      afterHidden={!selectedFilePath}
      afterWidth={UNIT * 40}
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

            {TAB_PUSH.uuid === selectedTab?.uuid && commitMemo}
          </>
        )}
      </Spacing>
    </Dashboard>
  );
}

export default VersionControl;
