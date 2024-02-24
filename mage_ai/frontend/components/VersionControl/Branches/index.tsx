import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import GitBranchType, { GitRemoteType } from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import {
  Add,
  Branch,
  Lightning,
  MultiShare,
  PaginateArrowLeft,
  PaginateArrowRight,
} from '@oracle/icons';
import {
  ACTION_DELETE,
  ACTION_MERGE,
  ACTION_REBASE,
} from '../constants';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { TAB_FILES, TAB_REMOTE } from '../constants';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { onSuccess } from '@api/utils/response';

type BranchesProps = {
  actionRemoteName: string;
  branch: GitBranchType;
  branches: GitBranchType[];
  fetchBranch: () => void;
  fetchBranches: () => void;
  remotes: GitRemoteType[];
  setActionRemoteName: (actionRemoteName: string) => void;
  showError: (opts: any) => void;
};

function Branches({
  actionRemoteName,
  branch,
  branches,
  fetchBranch,
  fetchBranches,
  remotes,
  setActionRemoteName,
  showError,
}: BranchesProps) {
  const [actionMessage, setActionMessage] = useState<string>('');
  const [actionName, setActionName] = useState<string>(null);
  const [actionProgress, setActionProgress] = useState<string>(null);
  const [branchBase, setBranchBase] = useState<string>(null);
  const [branchNameNew, setBranchNameNew] = useState<string>('');

  const selectedRemote = useMemo(() => remotes?.find(({ name }) => name === actionRemoteName), [
    actionRemoteName,
    remotes,
  ]);

  const allBranches = useMemo(() => branches?.concat(selectedRemote?.refs || []) || [], [
    branches,
    selectedRemote,
  ]);

  const [createGitBranch, { isLoading: isLoadingCreate }] = useMutation(api.git_custom_branches.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchBranch();
            fetchBranches();
            setBranchNameNew('');
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const [changeGitBranch, { isLoading: isLoadingChange }] = useMutation(api.git_custom_branches.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchBranch();
            window.location.reload();
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
    api.git_custom_branches.useUpdate(branch?.name),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            git_custom_branch: {
              progress,
            },
          }) => {
            fetchBranch();
            setActionMessage('');
            setActionName('');
            setActionProgress(progress);
            setBranchBase('');
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
        <Headline>
          Branches{branches ? ` (${branches?.length})` : ''}
        </Headline>

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
                  Current branch
                </Text>
              </Spacing>

              <FlexContainer alignItems="center">
                <Tooltip
                  fullSize
                  label="Choose a different branch to switch branches"
                  widthFitContent
                >
                  <Select
                    beforeIcon={<Branch muted={false} />}
                    beforeIconSize={UNIT * 2}
                    monospace
                    // @ts-ignore
                    onChange={e => changeGitBranch({
                      git_custom_branch: {
                        name: e.target.value,
                        remote: actionRemoteName,
                      },
                    })}
                    value={branch?.name}
                  >
                    {branch?.name && allBranches?.map(({ name }) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </Tooltip>

                <Spacing mr={PADDING_UNITS} />

                {isLoadingChange && (
                  <Spinner inverted />
                )}
              </FlexContainer>
            </div>
          </FlexContainer>
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          <FlexContainer alignItems="center">
            <TextInput
              label="New branch name"
              monospace
              onChange={e => setBranchNameNew(e?.target?.value)}
              value={branchNameNew || ''}
            />

            <Spacing mr={1} />

            <Button
              beforeIcon={<Add size={UNIT * 2} />}
              disabled={!branchNameNew}
              loading={isLoadingCreate}
              onClick={() => {
                // @ts-ignore
                createGitBranch({
                  git_custom_branch: {
                    name: branchNameNew,
                  },
                });
              }}
              primary
            >
              Create new branch
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
                Compare branch
              </Text>
            </Spacing>

            {branch?.name && (
              <Text monospace>
                {branch?.name}
              </Text>
            )}
          </Spacing>

          <FlexContainer alignItems="center">
            <div>
              <Spacing mb={1}>
                <Text bold muted>
                  Base branch
                </Text>
              </Spacing>

              <Select
                beforeIcon={<Branch />}
                beforeIconSize={UNIT * 1.5}
                monospace
                onChange={e => setBranchBase(e.target.value)}
                placeholder="Choose a branch"
                value={branchBase}
              >
                {allBranches?.map(({ name }) => (
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
                  Action
                </Text>
              </Spacing>

              <Select
                onChange={(e) => setActionName(e.target.value)}
                placeholder="Choose action"
                value={actionName || ''}
              >
                <option value={ACTION_MERGE}>
                  {capitalizeRemoveUnderscoreLower(ACTION_MERGE)}
                </option>
                <option value={ACTION_REBASE}>
                  {capitalizeRemoveUnderscoreLower(ACTION_REBASE)}
                </option>
                <option value={ACTION_DELETE}>
                  {capitalizeRemoveUnderscoreLower(ACTION_DELETE)}
                </option>
              </Select>
            </div>
          </FlexContainer>

          {actionName && [ACTION_MERGE, ACTION_REBASE].includes(actionName) && (
            <Spacing mt={PADDING_UNITS}>
              <Spacing mb={1}>
                <Text bold muted>
                  Message for {actionName}
                </Text>
              </Spacing>

              <TextArea
                monospace
                onChange={e => setActionMessage(e.target.value)}
                value={actionMessage || ''}
              />
            </Spacing>
          )}

          <Spacing mt={PADDING_UNITS}>
            <Button
              beforeIcon={<Lightning size={UNIT * 2} />}
              disabled={!actionName || !branchBase}
              loading={isLoadingAction}
              onClick={() => {
                if (ACTION_DELETE !== actionName || (
                  typeof window !== 'undefined'
                    && typeof location !== 'undefined'
                    && window.confirm(
                      `Are you sure you want to delete branch ${branchBase}?`,
                    )
                )) {
                  // @ts-ignore
                  actionGitBranch({
                    git_custom_branch: {
                      action_payload: {
                        base_branch: branchBase,
                      },
                      action_type: actionName,
                      message: actionMessage,
                    },
                  });
                }
              }}
              primary
            >
              {actionName ? capitalizeRemoveUnderscoreLower(actionName) : 'Execute action'}
            </Button>

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
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Spacing mb={UNITS_BETWEEN_SECTIONS}>
          <Divider light />
        </Spacing>

        <FlexContainer>
          <Button
            beforeIcon={<PaginateArrowLeft />}
            linkProps={{
              href: `/version-control?tab=${encodeURIComponent(TAB_REMOTE.uuid)}`,
            }}
            noBackground
            noHoverUnderline
            sameColorAsText
          >
            {TAB_REMOTE.uuid}
          </Button>

          <Spacing mr={1} />

          <Button
            afterIcon={<PaginateArrowRight />}
            linkProps={{
              href: `/version-control?tab=${TAB_FILES.uuid}`,
            }}
            noHoverUnderline
            sameColorAsText
            secondary
          >
            Next: {TAB_FILES.uuid}
          </Button>
        </FlexContainer>
      </Spacing>
    </>
  );
}

export default Branches;



