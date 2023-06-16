import NextLink from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import GitBranchType, { GitRemoteType } from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import api from '@api';
import { ACTION_PUSH, TAB_BRANCHES, TAB_FILES } from '../constants';
import { Branch, Lightning, MultiShare, PaginateArrowLeft } from '@oracle/icons';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { pluralize } from '@utils/string';

type CommitProps = {
  branch: GitBranchType;
  branches: GitBranchType[];
  fetchBranch: () => void;
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
            Logs
          </Headline>
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          {!dataBranch && <Spinner inverted />}
          {dataBranch && logsMemo}
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
