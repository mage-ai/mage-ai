import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import GitBranchType from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import {
  ACTION_MERGE,
  ACTION_PULL,
  ACTION_REBASE,
} from '../constants';
import {
  Add,
  Branch,
  GitHubIcon,
  Lightning,
  MultiShare,
  PaginateArrowRight,
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
  branches: GitBranchType[];
  showError: (opts: any) => void;
};

function Remote({
  branch,
  branches,
  showError,
}: RemoteProps) {
  const [actionName, setActionName] = useState<string>(null);
  const [actionBranchName, setActionBranchName] = useState<string>(null);
  const [actionRemoteName, setActionRemoteName] = useState<string>(null);
  const [remoteNameNew, setRemoteNameNew] = useState<string>('');
  const [remoteURLNew, setRemoteURLNew] = useState<string>('');
  const [remoteNameActive, setRemoteNameActive] = useState<string>(null);

  const { data: dataBranch, mutate: fetchBranch } = api.git_branches.detail('with_remotes', {
    '_format': 'with_remotes',
  });
  const branchGit = useMemo(() => dataBranch?.git_branch, [dataBranch]);
  const remotes = useMemo(() => branchGit?.remotes || [], [branchGit]);

  const [updateGitBranch, { isLoading: isLoadingUpdate }] = useMutation(
    api.git_branches.useUpdate(branch?.name),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchBranch();
            setRemoteNameNew('');
            setRemoteURLNew('');
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
      mb={UNITS_BETWEEN_SECTIONS}
    >
      <Spacing mb={1}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Headline level={5}>
            {name}
          </Headline>

          <Spacing mr={1} />

          <Button
            compact
            disabled={isLoadingRemoveRemote && remoteNameActive !== name}
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
          >
            Remove remote
          </Button>
        </FlexContainer>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        {urls?.map(url => (
          <Text key={url} monospace>
            {url}
          </Text>
        ))}
      </Spacing>

      <Accordion>
        <AccordionPanel
          noPaddingContent
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
          Sign in with GitHub
        </Button>
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
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
          <FlexContainer alignItems="center">

            <div>
              <Spacing mb={1}>
                <Text bold muted>
                  Action
                </Text>
              </Spacing>

              <Select
                onChange={(e) => setActionName(e.target.value)}
                placeholder="Choose an action"
                value={actionName || ''}
              >
                <option value={ACTION_PULL}>
                  {capitalizeRemoveUnderscoreLower(ACTION_PULL)}
                </option>
                <option value={ACTION_REBASE}>
                  {capitalizeRemoveUnderscoreLower(ACTION_REBASE)}
                </option>
                <option value={ACTION_MERGE}>
                  {capitalizeRemoveUnderscoreLower(ACTION_MERGE)}
                </option>
              </Select>
            </div>

            <Spacing mr={1} />

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
                placeholder="Choose a remote"
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
                  Remote branch
                </Text>
              </Spacing>

              <Select
                beforeIcon={<Branch />}
                beforeIconSize={UNIT * 1.5}
                monospace
                onChange={e => setActionBranchName(e.target.value)}
                placeholder="Choose all or a branch"
                value={actionBranchName || ''}
              >
                <option value="all">All branches</option>
                {branches?.map(({ name }) => (
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
                  Current branch
                </Text>
              </Spacing>

              <Select
                beforeIcon={<Branch />}
                beforeIconSize={UNIT * 1.5}
                disabled
                monospace
                value={branch?.name}
              >
                {branch?.name && (
                  <option key={branch?.name} value={branch?.name}>
                    {branch?.name}
                  </option>
                )}
              </Select>
            </div>
          </FlexContainer>

          <Spacing mt={PADDING_UNITS}>
            <Button
              beforeIcon={<Lightning size={UNIT * 2} />}
              disabled={!actionName || !actionRemoteName || !actionBranchName}
              onClick={() => {
                setActionName(null);
              }}
              secondary
            >
              Execute action{actionName ? ` ${actionName?.toLowerCase()}` : ''}
            </Button>
          </Spacing>
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
