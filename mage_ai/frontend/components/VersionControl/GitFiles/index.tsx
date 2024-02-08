import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import GitBranchType from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import api from '@api';
import { PADDING_UNITS, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import { PaginateArrowLeft, PaginateArrowRight } from '@oracle/icons';
import { SpacingStyle } from './index.style';
import {
  TAB_BRANCHES,
  TAB_PUSH,
} from '../constants';
import { isEmptyObject } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { pluralize } from '@utils/string';

type GitFilesProps = {
  branch: GitBranchType;
  fetchBranch: () => void;
  modifiedFiles: {
    [fullPath: string]: boolean;
  };
  setSelectedFilePath: (filePath: string) => void;
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
  fetchBranch: fetchBranchProp,
  modifiedFiles,
  setSelectedFilePath,
  showError,
  stagedFiles,
  untrackedFiles,
}: GitFilesProps) {
  const refCommitMessageTextArea = useRef(null);

  const [commitMessage, setCommitMessage] = useState<string>('');
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

  const stagedFilePaths = useMemo(() => Object.keys(stagedFiles || {}), [stagedFiles]);
  const stagedFilesCount = useMemo(() => stagedFilePaths.length, [stagedFilePaths]);

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
          fetchBranchProp();
          setSelectedFilesA({});
        },
        ...sharedUpdateProps,
      },
    ),
  }), [fetchBranchProp, sharedUpdateProps]);
  const updateEndpoint = useMemo(() => api.git_custom_branches.useUpdate(branch?.name), [branch]);

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
            fetchBranchProp();
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

            <Text bold>
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

                <Text default monospace>
                  {fullPath}
                </Text>
              </FlexContainer>
            </Link>
          </SpacingStyle>
        ))}
      </>
    );
  }, []);

  const noFilesASelected: boolean = useMemo(() => isEmptyObject(selectedFilesA), [selectedFilesA]);

  const { data: dataBranch, mutate: fetchBranch } = api.git_custom_branches.detail('with_logs', {
    '_format': 'with_logs',
  });
  const logs = useMemo(() => dataBranch?.git_custom_branch?.logs || [], [dataBranch]);

  const [updateGitBranchCommit, { isLoading: isLoadingUpdateCommit }] = useMutation(
    api.git_custom_branches.useUpdate(branch?.name),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchBranch();
            fetchBranchProp();
            setCommitMessage('');
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const logsMemo = useMemo(() => (
    <Table
      columnFlex={[1, 1, 1]}
      columns={[
        {
          uuid: 'Author',
        },
        {
          uuid: 'Date',
        },
        {
          uuid: 'Message',
        },
      ]}
      rows={logs.map(({
        author,
        date,
        message,
      }) => [
        <Text default key="author" monospace small>
          {author?.name}
        </Text>,
        <Text default key="date" monospace small>
          {date}
        </Text>,
        <Text default key="message" monospace small>
          {message}
        </Text>,
      ])}
      uuid="git-branch-logs"
    />
  ), [logs]);

  return (
    <>
      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <FlexContainer>
          <Flex flex={1} flexDirection="column">
            <Headline>
              Not staged {unstagedFilePaths?.length >= 1 && `(${unstagedFilePaths?.length})`}
            </Headline>

            <Spacing my={PADDING_UNITS}>
              <Divider light />
            </Spacing>

            <Spacing mb={PADDING_UNITS}>
              <FlexContainer flexDirection="row">
                <Button
                  compact
                  disabled={noFilesASelected || isLoadingUpdateB || isLoadingUpdateCheckout}
                  loading={isLoadingUpdate}
                  onClick={() => {
                    // @ts-ignore
                    updateGitBranch({
                      git_custom_branch: {
                        action_type: 'add',
                        files: Object.keys(selectedFilesA),
                      },
                    }).then(({ data }) => {
                      if (data?.git_custom_branch) {
                        refCommitMessageTextArea?.current?.focus();
                      }
                    });
                  }}
                  primary
                >
                  Add files
                </Button>

                <Spacing mr={1} />

                <Button
                  compact
                  disabled={noFilesASelected || isLoadingUpdate || isLoadingUpdateB}
                  loading={isLoadingUpdateCheckout}
                  noBackground
                  onClick={() => {
                    if (typeof window !== 'undefined'
                      && typeof location !== 'undefined'
                      && window.confirm(
                        'Are you sure you want to undo all changes in the selected files?',
                      )
                    ) {
                      // @ts-ignore
                      updateGitBranchCheckout({
                        git_custom_branch: {
                          action_type: 'checkout',
                          files: Object.keys(selectedFilesA),
                        },
                      });
                    }
                  }}
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

            <Spacing my={PADDING_UNITS}>
              <Divider light />
            </Spacing>

            <Spacing mb={PADDING_UNITS}>
              <FlexContainer flexDirection="row">
                <Button
                  compact
                  disabled={isEmptyObject(selectedFilesB) || isLoadingUpdate || isLoadingUpdateCheckout}
                  loading={isLoadingUpdateB}
                  onClick={() => {
                    // @ts-ignore
                    updateGitBranchB({
                      git_custom_branch: {
                        action_type: 'reset',
                        files: Object.keys(selectedFilesB),
                      },
                    });
                  }}
                  secondary
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
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Spacing mb={1}>
          <Headline>
            Commit
          </Headline>
        </Spacing>

        <Spacing mb={PADDING_UNITS}>
          <Accordion>
            <AccordionPanel
              noPaddingContent
              title={stagedFilesCount >= 1 ? `Staged files (${stagedFilesCount})` : 'No staged files'}
            >
              {stagedFilePaths?.map((filePath: string) => (
                <Spacing key={filePath} my={1} px={PADDING_UNITS}>
                  <FlexContainer justifyContent="space-between">
                    <Link
                      default
                      monospace
                      // @ts-ignore
                      onClick={() => setSelectedFilePath(prev => prev === filePath ? null : filePath)}
                      warning={modifiedFiles?.[filePath]}
                    >
                      {filePath}
                    </Link>

                    <Spacing mr={1} />

                    {modifiedFiles?.[filePath] && (
                      <Text warning>
                        Modified after staging
                      </Text>
                    )}
                  </FlexContainer>
                </Spacing>
              ))}
            </AccordionPanel>
          </Accordion>
        </Spacing>

        <TextArea
          // disabled={stagedFilesCount === 0}
          label="Commit message"
          monospace
          onChange={e => setCommitMessage(e.target.value)}
          ref={refCommitMessageTextArea}
          value={commitMessage || ''}
        />

        <Spacing mt={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Button
              disabled={stagedFilesCount === 0 || !(commitMessage?.length >= 1)}
              loading={isLoadingUpdateCommit}
              onClick={() => {
                // @ts-ignore
                updateGitBranchCommit({
                  git_custom_branch: {
                    action_type: 'commit',
                    message: commitMessage,
                  },
                });
              }}
              primary
            >
              Commit {pluralize('file', stagedFilesCount, true)} with message
            </Button>

            {stagedFilesCount === 0 && (
              <>
                <Spacing mr={1} />
                <Text danger small>
                  Please stage at least 1 file before committing.
                </Text>
              </>
            )}
          </FlexContainer>
        </Spacing>
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Accordion>
          <AccordionPanel
            noPaddingContent
            title="Logs"
          >
            {!dataBranch && (
              <Spacing p={PADDING_UNITS}>
                <Spinner inverted />
              </Spacing>
            )}
            {dataBranch && logsMemo}
          </AccordionPanel>
        </Accordion>
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Spacing mb={UNITS_BETWEEN_SECTIONS}>
          <Divider light />
        </Spacing>

        <FlexContainer>
          <Button
            beforeIcon={<PaginateArrowLeft />}
            linkProps={{
              href: `/version-control?tab=${TAB_BRANCHES.uuid}`,
            }}
            noBackground
            noHoverUnderline
            sameColorAsText
          >
            {TAB_BRANCHES.uuid}
          </Button>

          <Spacing mr={1} />

          <Button
            afterIcon={<PaginateArrowRight />}
            linkProps={noFilesASelected
              ? {
                href: `/version-control?tab=${encodeURIComponent(TAB_PUSH.uuid)}`,
              }
              : null
            }
            noHoverUnderline
            primary={noFilesASelected}
            sameColorAsText
            secondary={!noFilesASelected}
          >
            Next: {TAB_PUSH.uuid}
          </Button>
        </FlexContainer>
      </Spacing>
    </>
  );
}

export default GitFiles;
