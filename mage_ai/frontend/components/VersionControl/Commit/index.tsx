import NextLink from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
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
import {
  PADDING_UNITS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { PaginateArrowLeft } from '@oracle/icons';
import { TAB_FILES } from '../constants';
import { onSuccess } from '@api/utils/response';
import { pluralize } from '@utils/string';

type CommitProps = {
  branch: GitBranchType;
  fetchBranch: () => void;
  modifiedFiles: {
    [fullPath: string]: boolean;
  };
  showError: (opts: any) => void;
  stagedFiles: {
    [fullPath: string]: boolean;
  };
};

function Commit({
  branch,
  fetchBranch: fetchBranchProp,
  modifiedFiles,
  showError,
  stagedFiles,
}: CommitProps) {
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
                    <Text
                      default
                      monospace
                      warning={modifiedFiles?.[filePath]}
                    >
                      {filePath}
                    </Text>

                    <Spacing mr={1} />

                    {modifiedFiles?.[filePath] && (
                      <Text warning>
                        Modified since <NextLink
                          href={`/version-control?tab=${TAB_FILES.uuid}`}
                          passHref
                        >
                          <Link
                            bold
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
                      bold
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
            Logs
          </Headline>
        </Spacing>

        {!dataBranch && <Spinner inverted />}
        {dataBranch && logsMemo}
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
