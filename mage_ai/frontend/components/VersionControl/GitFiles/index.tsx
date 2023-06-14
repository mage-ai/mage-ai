import { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import GitBranchType from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SpacingStyle } from './index.style';
import { isEmptyObject } from '@utils/hash';
import { onSuccess } from '@api/utils/response';

type GitFilesProps = {
  branch: GitBranchType;
  fetchBranch: () => void;
  modifiedFiles: {
    [fullPath: string]: boolean;
  };
  showError: (opts: any) => void;
  stagedFiles: {
    [fullPath: string]: boolean;
  };
  untrackedFiles: {
    [fullPath: string]: boolean;
  };
};

function GitFiles({
  branch,
  fetchBranch,
  modifiedFiles,
  showError,
  stagedFiles,
  untrackedFiles,
}: GitFilesProps) {
  const [selectedFilesA, setSelectedFilesA] = useState<{
    [fullPath: string]: boolean;
  }>({});
  const [selectedFilesB, setSelectedFilesB] = useState<{
    [fullPath: string]: boolean;
  }>({});

  const unstagedFilePaths: string[] =
    useMemo(() => Object.keys(modifiedFiles).concat(Object.keys(untrackedFiles)).sort(), [
      modifiedFiles,
      untrackedFiles,
    ]);

  const stagedFilePaths: string[] =
    useMemo(() => Object.keys(stagedFiles), [
      stagedFiles,
    ]);

  const allFilesASelected =
    useMemo(() => Object.keys(selectedFilesA).length === unstagedFilePaths?.length, [
      selectedFilesA,
      unstagedFilePaths,
    ]);

  const allFilesBSelected =
    useMemo(() => Object.keys(selectedFilesB).length === stagedFilePaths?.length, [
      selectedFilesB,
      stagedFilePaths,
    ]);

  const sharedUpdateProps = useMemo(() => ({
    onErrorCallback: (response, errors) => showError({
      errors,
      response,
    }),
  }), [showError]);
  const sharedUpdateAProps = useMemo(() => ({
    onSuccess: (response: any) => onSuccess(
      response, {
        callback: () => {
          fetchBranch();
          setSelectedFilesA({});
        },
        ...sharedUpdateProps,
      },
    ),
  }), [fetchBranch, sharedUpdateProps]);
  const updateEndpoint = useMemo(() => api.git_branches.useUpdate(branch?.name), [branch]);

  const [updateGitBranch, { isLoading: isLoadingUpdate }] = useMutation(
    updateEndpoint,
    sharedUpdateAProps,
  );
  const [updateGitBranchCheckout, { isLoading: isLoadingUpdateCheckout }] = useMutation(
    updateEndpoint,
    sharedUpdateAProps,
  );
  const [updateGitBranchB, { isLoading: isLoadingUpdateB }] = useMutation(
    updateEndpoint,
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchBranch();
            setSelectedFilesB({});
          },
          ...sharedUpdateProps,
        },
      ),
    },
  );

  const renderColumn = useCallback((
    filePaths: string[],
    selectedFiles: {
      [fullPath: string]: boolean;
    },
    setSelectedFiles: any,
    allFiles: {
      [fullPath: string]: boolean;
    },
    allFilesSelected: boolean,
  ) => {
    const atLeast1File = filePaths?.length >= 1;

    return (
      <>
        <Link
          block
          noHoverUnderline
          onClick={() => {
            if (allFilesSelected) {
              setSelectedFiles({});
            } else {
              setSelectedFiles(allFiles);
            }
          }}
          preventDefault
        >
          <FlexContainer
            alignItems="center"
            flexDirection="row"
          >
            <Checkbox
              checked={atLeast1File && allFilesSelected}
              disabled={!atLeast1File}
            />

            <Spacing mr={1} />

            <Text bold small>
              {atLeast1File && allFilesSelected ? 'Unselect all' : 'Select all'}
            </Text>
          </FlexContainer>
        </Link>

        {filePaths.map((fullPath: string) => (
          <SpacingStyle key={fullPath}>
            <Link
              block
              noHoverUnderline
              onClick={() => setSelectedFiles((prev) => {
                const n = { ...prev };
                const val = !n?.[fullPath];
                if (val) {
                  n[fullPath] = true;
                } else {
                  delete n[fullPath];
                }

                return n;
              })}
              preventDefault
            >
              <FlexContainer
                alignItems="center"
                flexDirection="row"
              >
                <Checkbox
                  checked={!!selectedFiles?.[fullPath]}
                />

                <Spacing mr={1} />

                <Text default monospace small>
                  {fullPath}
                </Text>
              </FlexContainer>
            </Link>
          </SpacingStyle>
        ))}
      </>
    );
  }, []);

  return (
    <>
      <FlexContainer>
        <Flex flex={1} flexDirection="column">
          <Headline>
            Not staged {unstagedFilePaths?.length >= 1 && `(${unstagedFilePaths?.length})`}
          </Headline>

          <Spacing my={1}>
            <Divider light />
          </Spacing>

          <Spacing mb={1}>
            <FlexContainer flexDirection="row">
              <Button
                compact
                disabled={isEmptyObject(selectedFilesA) || isLoadingUpdateB || isLoadingUpdateCheckout}
                loading={isLoadingUpdate}
                onClick={() => {
                  updateGitBranch({
                    git_branch: {
                      action_type: 'add',
                      files: Object.keys(selectedFilesA),
                    },
                  });
                }}
                primary
                small
              >
                Add files
              </Button>

              <Spacing mr={1} />

              <Button
                compact
                disabled={isEmptyObject(selectedFilesA) || isLoadingUpdate || isLoadingUpdateB}
                loading={isLoadingUpdateCheckout}
                onClick={() => {
                  if (typeof window !== 'undefined'
                    && typeof location !== 'undefined'
                    && window.confirm(
                      'Are you sure you want to undo all changes in the selected files?',
                    )
                  ) {
                    updateGitBranchCheckout({
                      git_branch: {
                        action_type: 'checkout',
                        files: Object.keys(selectedFilesA),
                      },
                    });
                  }
                }}
                secondary
                small
              >
                Checkout files
              </Button>
            </FlexContainer>
          </Spacing>

          {renderColumn(
            unstagedFilePaths,
            selectedFilesA,
            setSelectedFilesA,
            {
              ...modifiedFiles,
              ...untrackedFiles,
            },
            allFilesASelected,
          )}
        </Flex>

        <Spacing mr={PADDING_UNITS} />

        <Flex flex={1} flexDirection="column">
          <Headline>
            Staged files {stagedFilePaths?.length >= 1 && `(${stagedFilePaths?.length})`}
          </Headline>

          <Spacing my={1}>
            <Divider light />
          </Spacing>

          <Spacing mb={1}>
            <FlexContainer flexDirection="row">
              <Button
                compact
                disabled={isEmptyObject(selectedFilesB) || isLoadingUpdate || isLoadingUpdateCheckout}
                loading={isLoadingUpdateB}
                onClick={() => {
                  updateGitBranchB({
                    git_branch: {
                      action_type: 'reset',
                      files: Object.keys(selectedFilesB),
                    },
                  });
                }}
                secondary
                small
              >
                Reset files
              </Button>
            </FlexContainer>
          </Spacing>

          {renderColumn(
            stagedFilePaths,
            selectedFilesB,
            setSelectedFilesB,
            stagedFiles,
            allFilesBSelected,
          )}
        </Flex>
      </FlexContainer>
    </>
  );
}

export default GitFiles;
