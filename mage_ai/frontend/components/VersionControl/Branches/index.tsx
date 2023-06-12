import { useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import GitBranchType from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import { Add, Branch } from '@oracle/icons';
import {
  ACTION_MERGE,
  ACTION_REBASE,
} from './constants';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

type BranchesProps = {
  branch: GitBranchType;
  branches: GitBranchType[];
  createBranch: (branchName: string) => void;
  onChangeBranch: (branchName: string) => void;
};

function Branches({
  branch,
  branches,
  createBranch,
  onChangeBranch,
}: BranchesProps) {
  const [branchNameNew, setBranchNameNew] = useState<string>('');
  const [actionName, setActionName] = useState<string>(null);

  return (
    <>
      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Headline>
          Branches{branches ? ` (${branches?.length})` : ''}
        </Headline>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          <Spacing mb={1}>
            <Headline level={5} muted>
              Current branch
            </Headline>
          </Spacing>

          <Tooltip
            fullSize
            label="Choose a different branch to switch branches"
            widthFitContent
          >
            <Select
              beforeIcon={<Branch muted={false} />}
              beforeIconSize={UNIT * 2}
              monospace
              onChange={e => onChangeBranch(e.target.value)}
              value={branch?.name}
            >
              {branch?.name && branches?.map(({ name }) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Tooltip>
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
              disabled={!branchNameNew}
              onClick={() => {
                createBranch(branchNameNew);
              }}
              secondary
            >
              <FlexContainer alignItems="center">
                <Add />

                <Spacing mr={1} />

                <Text>
                  Create new branch
                </Text>
              </FlexContainer>
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
                <Headline level={5} muted>
                  Base branch
                </Headline>
              </Spacing>

              <Select
                beforeIcon={<Branch />}
                beforeIconSize={UNIT * 1.5}
                compact
                monospace
                onChange={() => {
                  // Change branches
                }}
                small
                // value={branch?.name}
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
                <Headline level={5} muted>
                  Compare branch
                </Headline>
              </Spacing>

              <Select
                beforeIcon={<Branch />}
                beforeIconSize={UNIT * 1.5}
                compact
                disabled
                monospace
                small
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
                <Headline level={5} muted>
                  Action
                </Headline>
              </Spacing>

              <Select
                compact
                onChange={(e) => setActionName(e.target.value)}
                small
                value={actionName}
              >
                <option value="" />
                <option value={ACTION_MERGE}>
                  {capitalizeRemoveUnderscoreLower(ACTION_MERGE)}
                </option>
                <option value={ACTION_REBASE}>
                  {capitalizeRemoveUnderscoreLower(ACTION_REBASE)}
                </option>
              </Select>
            </div>
          </FlexContainer>

          <Spacing mt={1}>
            <Button
              disabled={!actionName}
              onClick={() => {
                // Execute action
              }}
              secondary
            >
              Execute action{actionName ? ` ${actionName?.toLowerCase()}` : ''}
            </Button>
          </Spacing>
        </Spacing>
      </Spacing>
    </>
  );
}

export default Branches;
