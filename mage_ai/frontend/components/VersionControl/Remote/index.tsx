import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import GitBranchType from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { Add, GitHubIcon, PaginateArrowRight } from '@oracle/icons';
import { TAB_BRANCHES } from '../constants';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { onSuccess } from '@api/utils/response';

type RemoteProps = {
  branch: GitBranchType;
  showError: (opts: any) => void;
};

function Remote({
  branch,
  showError,
}: RemoteProps) {
  const [remoteNameNew, setRemoteNameNew] = useState<string>('');
  const [remoteURLNew, setRemoteURLNew] = useState<string>('');
  const [remoteNameActive, setRemoteNameActive] = useState<string>(null);

  const { data: dataBranch, mutate: fetchBranch } = api.git_branches.detail(branch?.name, {
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
          <Headline>
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

      {refs?.length >= 1 && (
        <Accordion>
          <AccordionPanel
            noPaddingContent
            title="Refs"
          >
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
          </AccordionPanel>
        </Accordion>
      )}
    </Spacing>
  )), [
    isLoadingRemoveRemote,
    remoteNameActive,
    remotes,
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
