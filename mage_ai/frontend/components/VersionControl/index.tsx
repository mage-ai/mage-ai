import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer';
import { useEffect, useMemo, useRef, useState } from 'react';

import Dashboard from '@components/Dashboard';
import FileBrowser from '@components/FileBrowser';
import FileType from '@interfaces/FileType';
import GitBranchType from '@interfaces/GitBranchType';
import GitFileType from '@interfaces/GitFileType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import {
  DIFF_STYLES,
  DiffContainerStyle,
} from './index.style';
import { getFullPath } from '@components/FileBrowser/utils';
import { useError } from '@context/Error';

function VersionControl() {
  const fileTreeRef = useRef(null);

  const [showError] = useError(null, {}, [], {
    uuid: 'VersionControlPage',
  });

  const [branchBase, setBranchBase] = useState<string>('td--version_control');
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);

  const { data: dataBranches } = api.git_branches.list();
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
    untrackedFiles = {},
  }: {
    modifiedFiles: {
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
    untrackedFiles: branch?.untracked_files?.reduce((acc, fullPath) => ({
      ...acc,
      [fullPath]: true,
    }), {}),
  }), [branch]);

  const fileBrowserMemo = useMemo(() => (
    <FileBrowser
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

        if (children?.length >= 1) {
          return null;
        }

        const fullPath = getFullPath(file);
        let displayText;
        let displayTitle;
        const colorProps: {
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
          colorProps.success = true;
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
    untrackedFiles,
  ]);


  const fileDiffMemo = useMemo(() => {
    if (!selectedFilePath || !fileGit) {
      return null;
    }

    const {
      content,
      content_from_base: contentFromBase,
    } = fileGit;

    return (
      <DiffContainerStyle>
        <ReactDiffViewer
          compareMethod={DiffMethod.WORDS}
          newValue={content || ''}
          oldValue={contentFromBase || ''}
          renderContent={(str) => <Text monospace>{str}</Text>}
          splitView={true}
          styles={DIFF_STYLES}
          useDarkTheme
        />
      </DiffContainerStyle>
    );
  }, [
    fileGit,
    selectedFilePath,
  ]);

  return (
    <Dashboard
      // TODO (tommy dang): when we’re ready to show diffs, uncomment the below code.
      after={fileDiffMemo}
      afterHidden={!selectedFilePath}
      // afterHidden
      before={fileBrowserMemo}
      // headerOffset={MAIN_CONTENT_TOP_OFFSET}
      // mainContainerHeader={openFilePaths?.length >= 1 && (
      //   <HeaderStyle>
      //     <MenuStyle>
      //       {menuMemo}
      //     </MenuStyle>

      //     <TabsStyle>
      //       {fileTabsMemo}
      //     </TabsStyle>
      //   </HeaderStyle>
      // )}
      title="Version control"
      uuid="Version control/index"
    >
    </Dashboard>
  );
}

export default VersionControl;
