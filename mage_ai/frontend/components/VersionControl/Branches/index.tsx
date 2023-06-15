import { useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import GitBranchType from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import { Add, Branch, Lightning, PaginateArrowLeft, PaginateArrowRight } from '@oracle/icons';
import {
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
  branch: GitBranchType;
  branches: GitBranchType[];
  fetchBranch: () => void;
  fetchBranches: () => void;
  showError: (opts: any) => void;
};

function Branches({
  branch,
  branches,
  fetchBranch,
  fetchBranches,
  showError,
}: BranchesProps) {
  const [actionMessage, setActionMessage] = useState<string>('');
  const [actionName, setActionName] = useState<string>(null);
  const [branchBase, setBranchBase] = useState<string>(null);
  const [branchNameNew, setBranchNameNew] = useState<string>('');

  const [createGitBranch, { isLoading: isLoadingCreate }] = useMutation(api.git_branches.useCreate(),
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
  const [changeGitBranch, { isLoading: isLoadingChange }] = useMutation(api.git_branches.useCreate(),
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

  return (
    <>
      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Headline>
          Branches{branches ? ` (${branches?.length})` : ''}
        </Headline>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
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
                onChange={e => changeGitBranch({
                  git_branch: {
                    name: e.target.value,
                  },
                })}
                value={branch?.name}
              >
                {branch?.name && branches?.map(({ name }) => (
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
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          <FlexContainer>
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
                createGitBranch({
                  git_branch: {
                    name: branchNameNew,
                  },
                });
              }}
              secondary
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
                  Compare branch
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

            <Spacing mr={1} />

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
                <option value={ACTION_MERGE}>
                  {capitalizeRemoveUnderscoreLower(ACTION_MERGE)}
                </option>
                <option value={ACTION_REBASE}>
                  {capitalizeRemoveUnderscoreLower(ACTION_REBASE)}
                </option>
              </Select>
            </div>
          </FlexContainer>

          {actionName && ACTION_MERGE === actionName && (
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
            beforeIcon={<PaginateArrowLeft />}
            linkProps={{
              href: `/version-control?tab=${TAB_REMOTE.uuid}`,
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
