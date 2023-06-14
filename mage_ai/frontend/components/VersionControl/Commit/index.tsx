import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import GitBranchType from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import api from '@api';
import {
  PADDING_UNITS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { onSuccess } from '@api/utils/response';
import { pluralize } from '@utils/string';

type CommitProps = {
  branch: GitBranchType;
  fetchBranch: () => void;
  showError: (opts: any) => void;
  stagedFiles: {
    [fullPath: string]: boolean;
  };
};

function Commit({
  branch,
  fetchBranch: fetchBranchProp,
  showError,
  stagedFiles,
}: CommitProps) {
  const [commitMessage, setCommitMessage] = useState<string>('');

  const { data: dataBranch, mutate: fetchBranch } = api.git_branches.detail(branch?.name, {
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
      }: UserType) => [
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

  return (
    <>
      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        {stagedFilesCount >= 1 && (
          <Spacing mb={PADDING_UNITS}>
            <Accordion>
              <AccordionPanel
                noPaddingContent
                title={`Staged files (${stagedFilesCount})`}
              >
                {stagedFilesPaths?.map((filePath: string) => (
                  <Spacing key={filePath} my={1} px={1}>
                    <Text
                      default
                      monospace
                      small
                    >
                      {filePath}
                    </Text>
                  </Spacing>
                ))}
              </AccordionPanel>
            </Accordion>
          </Spacing>
        )}

        <TextArea
          label="Commit message"
          monospace
          onChange={e => setCommitMessage(e.target.value)}
          value={commitMessage || ''}
        />

        <Spacing mt={PADDING_UNITS}>
          {stagedFilesCount === 0 && (
            <Text danger italic>
              No files are staged.
              <br />
              Please stage at least 1 file before creating a commit message.
            </Text>
          )}
          {stagedFilesCount >= 1 && (
            <Button
              disabled={!(commitMessage?.length >= 1)}
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
          )}
        </Spacing>
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Spacing mb={1}>
          <Headline>
            Logs
          </Headline>
        </Spacing>

        {!dataBranch && <Spinner inverted />}
        {dataBranch && logsMemo}
      </Spacing>
    </>
  );
}

export default Commit;
