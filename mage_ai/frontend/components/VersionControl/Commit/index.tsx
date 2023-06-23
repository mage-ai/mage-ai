import NextLink from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import GitBranchType, { GitRemoteType } from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PullRequestType from '@interfaces/PullRequestType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { ACTION_PUSH, TAB_FILES } from '../constants';
import { Branch, GitHubIcon, Lightning, MultiShare, PaginateArrowLeft } from '@oracle/icons';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower, pluralize } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { unique } from '@utils/array';

type CommitProps = {
  branch: GitBranchType;
  branches: GitBranchType[];
  fetchBranch: () => void;
  loading?: boolean;
  modifiedFiles: {
    [fullPath: string]: boolean;
  };
  remotes: GitRemoteType[];
  setSelectedFilePath: (filePath: string) => void;
  showError: (opts: any) => void;
  stagedFiles: {
    [fullPath: string]: boolean;
  };
};

function Commit({
  branch,
  branches,
  fetchBranch: fetchBranchProp,
  loading,
  modifiedFiles,
  remotes,
  setSelectedFilePath,
  showError,
  stagedFiles,
}: CommitProps) {
  const [actionBranchName, setActionBranchName] = useState<string>(branch?.name || '');
  const [actionError, setActionError] = useState<string>(null);
  const [actionProgress, setActionProgress] = useState<string>(null);
  const [actionRemoteName, setActionRemoteName] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [pullRequest, setPullRequest] = useState<PullRequestType>({});
  const [repositoryName, setRepositoryName] = useState<string>(null);

  const { data: dataBranch, mutate: fetchBranch } = api.git_branches.detail('with_logs', {
    '_format': 'with_logs',
  });
  const logs = useMemo(() => dataBranch?.git_branch?.logs || [], [dataBranch]);

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

  const stagedFilesPaths = useMemo(() => Object.keys(stagedFiles || {}), [stagedFiles]);
  const stagedFilesCount = useMemo(() => stagedFilesPaths.length, [stagedFilesPaths]);

  const [updateGitBranch, { isLoading: isLoadingUpdate }] = useMutation(
    api.git_branches.useUpdate(branch?.name),
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

  const [actionGitBranch, { isLoading: isLoadingAction }] = useMutation(
    api.git_branches.useUpdate(branch?.name),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            git_branch: {
              error,
              progress,
            },
          }) => {
            if (error) {
              setActionError(error);
              setActionProgress(null);
            } else {
              fetchBranch();
              setActionBranchName(null);
              setActionError(null);
              setActionRemoteName(null);
              setActionProgress(progress);
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

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

  const { data: dataPullRequests, mutate: fetchPullRequests } = api.pull_requests.list({
    repository: repositoryName,
  }, {}, {
    pauseFetch: !repositoryName,
  });
  const pullRequests: PullRequestType[] =
    useMemo(() => dataPullRequests?.pull_requests || [], [dataPullRequests]);
  const pullRequestsMemo = useMemo(() => (
    <Table
      columnFlex={[null, null, null, null]}
      columns={[
        {
          uuid: 'Title',
        },
        {
          uuid: 'Author',
        },
        {
          uuid: 'Created',
        },
        {
          uuid: 'Last modified',
        },
      ]}
      onClickRow={(rowIndex: number) => {
        const url = pullRequests?.[rowIndex]?.url;

        if (url && typeof window !== 'undefined') {
          window.open(url, '_blank');
        }
      }}
      rows={pullRequests?.map(({
        created_at: createdAt,
        last_modified: lastModified,
        title,
        url,
        user,
      }) => [
        <Link
          default
          href={url}
          key="title"
          monospace
          openNewWindow
          small
        >
          {title}
        </Link>,
        <Text default key="user" monospace small>
          {user}
        </Text>,
        <Text default key="createdAt" monospace small>
          {createdAt}
        </Text>,
        <Text default key="lastModified" monospace small>
          {lastModified || '-'}
        </Text>,
      ])}
      uuid="pull-requests"
    />
  ), [pullRequests]);

  const { data: dataGitBranches } = api.git_branches.list({
    repository: repositoryName,
  }, {}, {
    pauseFetch: !repositoryName,
  });
  const branchesForRepository: GitBranchType[] =
    useMemo(() => dataGitBranches?.git_branches || [], [dataGitBranches]);

  useEffect(() => {
    if (!pullRequest?.compare_branch && branchesForRepository?.includes(branch?.name)) {
      // @ts-ignore
      setPullRequest(prev => ({
        ...prev,
        compare_branch: branch?.name,
      }));
    }
  }, [
    branch,
    branchesForRepository,
    pullRequest,
  ]);

  const [createPullRequest, { isLoading: isLoadingCreatePullRequest }] = useMutation(
    api.pull_requests.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPullRequests();
            setPullRequest({});
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  return (
    <>
      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Spacing mb={PADDING_UNITS}>
          <Accordion>
            <AccordionPanel
              noPaddingContent
              title={stagedFilesCount >= 1 ? `Staged files (${stagedFilesCount})` : 'No staged files'}
            >
              {stagedFilesPaths?.map((filePath: string) => (
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
                        Modified after <NextLink
                          href={`/version-control?tab=${TAB_FILES.uuid}`}
                          passHref
                        >
                          <Link
                            underline
                            warning
                          >
                            staging
                          </Link>
                        </NextLink>
                      </Text>
                    )}
                  </FlexContainer>
                </Spacing>
              ))}
            </AccordionPanel>
          </Accordion>
        </Spacing>

        <TextArea
          disabled={stagedFilesCount === 0}
          label="Commit message"
          monospace
          onChange={e => setCommitMessage(e.target.value)}
          value={commitMessage || ''}
        />

        <Spacing mt={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Button
              disabled={stagedFilesCount === 0 || !(commitMessage?.length >= 1)}
              loading={isLoadingUpdate}
              onClick={() => {
                // @ts-ignore
                updateGitBranch({
                  git_branch: {
                    action_type: 'commit',
                    files: stagedFilesPaths,
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
                  Please <NextLink
                    href={`/version-control?tab=${TAB_FILES.uuid}`}
                    passHref
                  >
                    <Link
                      danger
                      small
                      underline
                    >
                      stage
                    </Link>
                  </NextLink> at least 1 file before committing.
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
        <Spacing mb={1}>
          <Headline>
            {capitalizeRemoveUnderscoreLower(ACTION_PUSH)}
          </Headline>
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          <FlexContainer>
            <div>
              <Spacing mb={1}>
                <Text bold muted>
                  Remote
                </Text>
              </Spacing>

              {loading && <Spinner inverted />}
              {!loading && (
                <Select
                  beforeIcon={<MultiShare />}
                  beforeIconSize={UNIT * 1.5}
                  monospace
                  onChange={e => setActionRemoteName(e.target.value)}
                  placeholder="Choose remote"
                  value={actionRemoteName || ''}
                >
                  {remotes?.map(({ name }) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <Spacing mr={1} />

            <div>
              <Spacing mb={1}>
                <Text bold muted>
                  Branch
                </Text>
              </Spacing>

              <Select
                beforeIcon={<Branch />}
                beforeIconSize={UNIT * 1.5}
                monospace
                onChange={e => setActionBranchName(e.target.value)}
                placeholder="Choose branch"
                value={actionBranchName || ''}
              >
                <option value="" />
                {branches?.map(({ name }) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
          </FlexContainer>

          <Spacing mt={PADDING_UNITS}>
            <Button
              beforeIcon={<Lightning size={UNIT * 2} />}
              disabled={!actionRemoteName || !actionBranchName}
              loading={isLoadingAction}
              onClick={() => {
                setActionProgress(null);
                // @ts-ignore
                actionGitBranch({
                  git_branch: {
                    action_type: ACTION_PUSH,
                    [ACTION_PUSH]: {
                      branch: actionBranchName,
                      remote: actionRemoteName,
                    },
                  },
                });
              }}
              primary
            >
              {capitalizeRemoveUnderscoreLower(ACTION_PUSH)} {actionRemoteName} {actionRemoteName && actionBranchName}
            </Button>
          </Spacing>

          {(actionProgress || actionError) && (
            <Spacing mt={PADDING_UNITS}>
              <Text
                danger={!!actionError}
                default={!!actionProgress}
                monospace
                preWrap
              >
                {actionProgress || actionError}
              </Text>
            </Spacing>
          )}
        </Spacing>
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Spacing mb={1}>
          <Headline>
            Create pull request
          </Headline>
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          {loading && (
            <Spinner inverted />
          )}

          {!loading && (
            <>
              <FlexContainer>
                <div>
                  <Spacing mb={1}>
                    <Text bold muted>
                      Repository
                    </Text>
                  </Spacing>

                  <Select
                    beforeIcon={<GitHubIcon />}
                    beforeIconSize={UNIT * 1.5}
                    monospace
                    onChange={e => setRepositoryName(e.target.value)}
                    placeholder="Choose repository"
                    value={repositoryName || ''}
                  >
                    {repositories?.map(({
                      name,
                    }) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </div>

                <Spacing mr={1} />

                <div>
                  <Spacing mb={1}>
                    <Text bold muted>
                      Base branch
                    </Text>
                  </Spacing>

                  {repositoryName && !dataGitBranches && <Spinner inverted />}
                  {(!repositoryName || dataGitBranches) && (
                    <Select
                      beforeIcon={<Branch />}
                      beforeIconSize={UNIT * 1.5}
                      disabled={!repositoryName}
                      monospace
                      // @ts-ignore
                      onChange={e => setPullRequest(prev => ({
                        ...prev,
                        base_branch: e.target.value,
                      }))}
                      placeholder="Choose branch"
                      value={pullRequest?.base_branch || ''}
                    >
                      {branchesForRepository?.map(({ name }) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                <Spacing mr={1} />

                <div>
                  <Spacing mb={1}>
                    <Text bold muted>
                      Compare branch
                    </Text>
                  </Spacing>

                  {repositoryName && !dataGitBranches && <Spinner inverted />}
                  {(!repositoryName || dataGitBranches || pullRequest?.compare_branch) && (
                    <Select
                      beforeIcon={<Branch />}
                      beforeIconSize={UNIT * 1.5}
                      disabled={!repositoryName}
                      monospace
                      // @ts-ignore
                      onChange={e => setPullRequest(prev => ({
                        ...prev,
                        compare_branch: e.target.value,
                      }))}
                      placeholder="Choose branch"
                      value={pullRequest?.compare_branch || ''}
                    >
                      {!branchesForRepository?.length && pullRequest?.compare_branch && (
                        <option value={pullRequest?.compare_branch}>
                          {pullRequest?.compare_branch}
                        </option>
                      )}
                      {branchesForRepository?.map(({ name }) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              </FlexContainer>

              <Spacing mt={1}>
                <TextInput
                  label="Title"
                  monospace
                  // @ts-ignore
                  onChange={e => setPullRequest(prev => ({
                    ...prev,
                    title: e.target.value,
                  }))}
                  value={pullRequest?.title || ''}
                />
              </Spacing>

              <Spacing mt={1}>
                <TextArea
                  label="Description"
                  monospace
                  // @ts-ignore
                  onChange={e => setPullRequest(prev => ({
                    ...prev,
                    body: e.target.value,
                  }))}
                  value={pullRequest?.body || ''}
                />
              </Spacing>

              <Spacing mt={PADDING_UNITS}>
                <Button
                  beforeIcon={<Lightning size={UNIT * 2} />}
                  disabled={!repositoryName || !pullRequest?.title || !pullRequest?.base_branch || !pullRequest?.compare_branch}
                  loading={isLoadingCreatePullRequest}
                  onClick={() => {
                    createPullRequest({
                      pull_request: pullRequest,
                    });
                  }}
                  primary
                >
                  Create new pull request
                </Button>
              </Spacing>
            </>
          )}
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          <Accordion visibleMapping={{ 0: !repositoryName }}>
            <AccordionPanel
              noPaddingContent
              title={dataPullRequests ? `Pull requests (${pullRequests?.length})` : 'Pull requests'}
            >
              {!repositoryName && (
                <Spacing p={PADDING_UNITS}>
                  <Text muted>
                    Please select a repository to view open pull requests.
                  </Text>
                </Spacing>
              )}

              {repositoryName && (
                <>
                  {!dataPullRequests && (
                    <Spacing p={PADDING_UNITS}>
                      <Spinner inverted />
                    </Spacing>
                  )}
                  {dataPullRequests && pullRequestsMemo}
                </>
              )}
            </AccordionPanel>
          </Accordion>
        </Spacing>
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Spacing mb={UNITS_BETWEEN_SECTIONS}>
          <Divider light />
        </Spacing>

        <FlexContainer>
          <Button
            beforeIcon={<PaginateArrowLeft />}
            linkProps={{
              href: `/version-control?tab=${TAB_FILES.uuid}`,
            }}
            noBackground
            noHoverUnderline
            sameColorAsText
          >
            {TAB_FILES.uuid}
          </Button>
        </FlexContainer>
      </Spacing>
    </>
  );
}

export default Commit;
