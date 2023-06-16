import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import GitBranchType from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { ACTION_PULL } from '../constants';
import {
  Add,
  Branch,
  ChevronRight,
  GitHubIcon,
  Lightning,
  MultiShare,
  PaginateArrowRight,
  Trash,
} from '@oracle/icons';
import { TAB_BRANCHES } from '../constants';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { onSuccess } from '@api/utils/response';

type RemoteProps = {
  branch: GitBranchType;
  showError: (opts: any) => void;
};

function Remote({
  branch,
  showError,
}: RemoteProps) {
  const refInputRepoPath = useRef(null);

  const [actionName, setActionName] = useState<string>(null);
  const [actionProgress, setActionProgress] = useState<string>(null);
  const [actionBranchName, setActionBranchName] = useState<string>(null);
  const [actionRemoteName, setActionRemoteName] = useState<string>(null);
  const [remoteNameNew, setRemoteNameNew] = useState<string>('');
  const [remoteURLNew, setRemoteURLNew] = useState<string>('');
  const [remoteNameActive, setRemoteNameActive] = useState<string>(null);
  const [repoPath, setRepoPath] = useState<string>(null);
  const [editRepoPathActive, setEditRepoPathActive] = useState<boolean>(false);

  useEffect(() => {
    if (branch?.sync_config?.repo_path && repoPath === null) {
      setRepoPath(branch?.sync_config?.repo_path);
    }
  }, [branch, repoPath]);

  const { data: dataBranch, mutate: fetchBranch } = api.git_branches.detail('with_remotes', {
    '_format': 'with_remotes',
  });
  const branchGit = useMemo(() => dataBranch?.git_branch, [dataBranch]);
  const remotes = useMemo(() => branchGit?.remotes || [], [branchGit]);
  const branches = useMemo(() => remotes?.find(({
    name,
  }) => name === actionRemoteName)?.refs?.map(({
    name,
  }) => ({
    name: name.split(`${actionRemoteName}/`)[1],
  })), [
    actionRemoteName,
    remotes,
  ]);

  const [createSyncs, { isLoading: isLoadingCreateSyncs }] = useMutation(
    api.syncs.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchBranch();
            setEditRepoPathActive(false);
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
              progress,
            },
          }) => {
            fetchBranch();
            setActionBranchName(null);
            setActionName(null);
            setActionRemoteName(null);
            setActionProgress(progress);
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [updateGitBranch, { isLoading: isLoadingUpdate }] = useMutation(
    api.git_branches.useUpdate(branch?.name),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchBranch();
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [removeRemote, { isLoading: isLoadingRemoveRemote }] = useMutation(
    api.git_branches.useUpdate(branch?.name),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchBranch();
            setRemoteNameActive(null);
          },
          onErrorCallback: (response, errors) => {
            setRemoteNameActive(null);
            showError({
              errors,
              response,
            });
          },
        },
      ),
    },
  );

  const remotesMemo = useMemo(() => remotes?.map(({
    name,
    refs,
    urls,
  }) => (
    <Spacing
      key={name}
      mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}
    >
      <Spacing mb={1}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Flex alignItems="center">
            <Text bold>
              {name}
            </Text>

            <Spacing mx={1}>
              <ChevronRight muted />
            </Spacing>

            {urls?.map(url => (
              <Spacing key={url} mr={1}>
                <Text default monospace small>
                  {url}
                </Text>
              </Spacing>
            ))}
          </Flex>

          <Spacing mr={1} />

          <Button
            compact
            disabled={isLoadingRemoveRemote && remoteNameActive !== name}
            iconOnly
            loading={isLoadingRemoveRemote && remoteNameActive === name}
            noBackground
            onClick={() => {
              if (typeof window !== 'undefined'
                && typeof location !== 'undefined'
                && window.confirm(
                  `Are you sure you want to remove remote ${name}?`,
                )
              ) {
                setRemoteNameActive(name);

                removeRemote({
                  git_branch: {
                    action_type: 'remove_remote',
                    remote: {
                      name,
                    },
                  },
                });
              }
            }}
            small
            title={`Remote remote ${name}`}
          >
            <Trash />
          </Button>
        </FlexContainer>
      </Spacing>

      <Accordion>
        <AccordionPanel
          noPaddingContent
          smallTitle
          title={`Refs (${refs?.length})`}
        >
          {refs?.length === 0 && (
            <Spacing p={PADDING_UNITS}>
              <Text muted>
                This remote has no refs.
              </Text>
            </Spacing>
          )}

          {refs?.length >= 1 && (
            <Table
              columnFlex={[1, 1, 1]}
              columns={[
                {
                  uuid: 'Ref',
                },
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
              rows={refs.map(({
                commit,
                name: nameOfRef,
              }) => [
                <Text default key="ref-name" monospace small>
                  {nameOfRef}
                </Text>,
                <Text default key="author" monospace small>
                  {commit?.author?.name}
                </Text>,
                <Text default key="date" monospace small>
                  {commit?.date}
                </Text>,
                <Text default key="message" monospace small>
                  {commit?.message}
                </Text>,
              ])}
              uuid="git-branch-remotes-refs"
            />
          )}
        </AccordionPanel>
      </Accordion>

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
        <Divider light />
      </Spacing>
    </Spacing>
  )), [
    isLoadingRemoveRemote,
    remoteNameActive,
    remotes,
    removeRemote,
  ]);

  return (
    <>
      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Button
          beforeIcon={<GitHubIcon size={UNIT * 2} />}
          disabled
          primary
        >
          Authenticate with GitHub
        </Button>
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Headline>
          Setup
        </Headline>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          <Spacing mb={1}>
            <Text bold large>
              Git init directory
            </Text>
            <Text muted>
              If the directory below is blank,
              then the current working directory will be used
              to initialize git.
              <br />
              If git hasn’t been initialized in the directory below,
              Mage will automatically run git init for you.
            </Text>
          </Spacing>

          <FlexContainer alignItems="center">
            <TextInput
              disabled={!editRepoPathActive}
              label="Git directory"
              monospace
              onChange={e => setRepoPath(e.target.value)}
              ref={refInputRepoPath}
              value={repoPath || ''}
            />

            <Spacing mr={1} />

            {editRepoPathActive && (
              <>
                <Button
                  compact
                  loading={isLoadingCreateSyncs}
                  onClick={() => {
                    createSyncs({
                      sync: {
                        repo_path: repoPath,
                      },
                    });
                  }}
                  primary
                  small
                >
                  Save
                </Button>

                <Spacing mr={1} />

                <Link
                  onClick={() => setEditRepoPathActive(false)}
                  preventDefault
                  sameColorAsText
                  small
                >
                  Cancel
                </Link>
              </>
            )}

            {!editRepoPathActive && (
              <Link
                onClick={() => {
                  setEditRepoPathActive(true);
                  setTimeout(() => refInputRepoPath?.current?.focus(), 1);
                }}
                preventDefault
                sameColorAsText
                small
              >
                Edit
              </Link>
            )}
          </FlexContainer>
        </Spacing>
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Headline>
          Remotes{dataBranch && remotes ? ` (${remotes?.length})` : ''}
        </Headline>

        {remotesMemo}

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          <FlexContainer>
            <TextInput
              label="New remote name"
              monospace
              onChange={e => setRemoteNameNew(e?.target?.value)}
              value={remoteNameNew || ''}
            />

            <Spacing mr={1} />

            <TextInput
              label="Remote URL"
              monospace
              onChange={e => setRemoteURLNew(e?.target?.value)}
              value={remoteURLNew || ''}
            />

            <Spacing mr={1} />

            <Button
              beforeIcon={<Add size={UNIT * 2} />}
              disabled={!remoteNameNew || !remoteURLNew}
              loading={isLoadingUpdate}
              onClick={() => {
                updateGitBranch({
                  git_branch: {
                    action_type: 'add_remote',
                    remote: {
                      name: remoteNameNew,
                      url: remoteURLNew,
                    },
                  },
                }).then(() => {
                  setRemoteNameNew('');
                  setRemoteURLNew('');
                });
              }}
              secondary
            >
              Create new remote
            </Button>
          </FlexContainer>
        </Spacing>
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Headline>
          Actions
        </Headline>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          <Spacing mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <Spacing mb={1}>
              <Text bold muted>
                Current branch
              </Text>
            </Spacing>

            {branch?.name && (
              <Text monospace>
                {branch?.name}
              </Text>
            )}
          </Spacing>

          <FlexContainer>
            <Select
              onChange={(e) => setActionName(e.target.value)}
              placeholder="Action"
              value={actionName || ''}
            >
              <option value={ACTION_PULL}>
                {capitalizeRemoveUnderscoreLower(ACTION_PULL)}
              </option>
            </Select>

            <Spacing mr={1} />

            <Select
              beforeIcon={<MultiShare />}
              beforeIconSize={UNIT * 1.5}
              monospace
              onChange={e => setActionRemoteName(e.target.value)}
              placeholder="Remote"
              value={actionRemoteName || ''}
            >
              {remotes?.map(({ name }) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>

            <Spacing mr={1} />

            <Select
              beforeIcon={<Branch />}
              beforeIconSize={UNIT * 1.5}
              monospace
              onChange={e => setActionBranchName(e.target.value)}
              value={actionBranchName || ''}
            >
              <option value="">All branches</option>
              {branches?.map(({ name }) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>

            <Spacing mr={1} />

            <Button
              beforeIcon={<Lightning size={UNIT * 2} />}
              disabled={!actionName || !actionRemoteName}
              loading={isLoadingAction}
              onClick={() => {
                setActionProgress(null);
                actionGitBranch({
                  git_branch: {
                    action_type: actionName,
                    pull: {
                      branch: actionBranchName,
                      remote: actionRemoteName,
                    },
                  },
                });
              }}
              secondary
            >
              {actionName ? capitalizeRemoveUnderscoreLower(actionName) : 'Execute action'}
            </Button>
          </FlexContainer>

          {actionProgress && (
            <Spacing mt={PADDING_UNITS}>
              <Text
                default
                monospace
                preWrap
              >
                {actionProgress}
              </Text>
            </Spacing>
          )}
        </Spacing>
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Spacing mb={UNITS_BETWEEN_SECTIONS}>
          <Divider light />
        </Spacing>

        <FlexContainer>
          <Button
            afterIcon={<PaginateArrowRight />}
            linkProps={{
              href: `/version-control?tab=${TAB_BRANCHES.uuid}`,
            }}
            noHoverUnderline
            sameColorAsText
            secondary
          >
            Next: {TAB_BRANCHES.uuid}
          </Button>
        </FlexContainer>
      </Spacing>
    </>
  );
}

export default Remote;
