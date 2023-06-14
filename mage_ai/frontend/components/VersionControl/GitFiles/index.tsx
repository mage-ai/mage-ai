import { useCallback, useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import GitBranchType from '@interfaces/GitBranchType';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SpacingStyle } from './index.style';
import { isEmptyObject } from '@utils/hash';

type GitFilesProps = {
  branch: GitBranchType;
  modifiedFiles: {
    [fullPath: string]: boolean;
  };
  stagedFiles: {
    [fullPath: string]: boolean;
  };
  untrackedFiles: {
    [fullPath: string]: boolean;
  };
};

function GitFiles({
  branch,
  modifiedFiles,
  stagedFiles,
  untrackedFiles,
}: GitFilesProps) {
  const [selectedFilesA, setSelectedFilesA] = useState<{
    [fullPath: string]: boolean;
  }>({});
  const [selectedFilesB, setSelectedFilesB] = useState<{
    [fullPath: string]: boolean;
  }>({});

  const unstagedFilePaths: string[] =
    useMemo(() => Object.keys(modifiedFiles).concat(Object.keys(untrackedFiles)).sort(), [
      modifiedFiles,
      untrackedFiles,
    ]);

  const stagedFilePaths: string[] =
    useMemo(() => Object.keys(stagedFiles), [
      stagedFiles,
    ]);

  const allFilesASelected =
    useMemo(() => Object.keys(selectedFilesA).length === unstagedFilePaths?.length, [
      selectedFilesA,
      unstagedFilePaths,
    ]);

  const allFilesBSelected =
    useMemo(() => Object.keys(selectedFilesB).length === stagedFilePaths?.length, [
      selectedFilesB,
      stagedFilePaths,
    ]);

  const renderColumn = useCallback((
    filePaths: string[],
    selectedFiles: {
      [fullPath: string]: boolean;
    },
    setSelectedFiles: any,
    allFiles: {
      [fullPath: string]: boolean;
    },
    allFilesSelected: boolean,
  ) => (
    <>
      <Link
        block
        noHoverUnderline
        onClick={() => {
          if (allFilesSelected) {
            setSelectedFiles({});
          } else {
            setSelectedFiles(allFiles);
          }
        }}
        preventDefault
      >
        <FlexContainer
          alignItems="center"
          flexDirection="row"
        >
          <Checkbox
            checked={allFilesSelected}
          />

          <Spacing mr={1} />

          <Text bold small>
            {allFilesSelected ? 'Unselect all' : 'Select all'}
          </Text>
        </FlexContainer>
      </Link>

      {filePaths.map((fullPath: string) => (
        <SpacingStyle key={fullPath}>
          <Link
            block
            noHoverUnderline
            onClick={() => setSelectedFiles((prev) => {
              const n = { ...prev };
              const val = !n?.[fullPath];
              if (val) {
                n[fullPath] = true;
              } else {
                delete n[fullPath];
              }

              return n;
            })}
            preventDefault
          >
            <FlexContainer
              alignItems="center"
              flexDirection="row"
            >
              <Checkbox
                checked={!!selectedFiles?.[fullPath]}
              />

              <Spacing mr={1} />

              <Text default monospace small>
                {fullPath}
              </Text>
            </FlexContainer>
          </Link>
        </SpacingStyle>
      ))}
    </>
  ), []);

  return (
    <>
      <FlexContainer>
        <Flex flexDirection="column">
          <Spacing mb={PADDING_UNITS}>
            <Headline>
              Not staged
            </Headline>
          </Spacing>

          <Spacing mb={1}>
            <FlexContainer flexDirection="row">
              <Button
                compact
                disabled={isEmptyObject(selectedFilesA)}
                primary
                small
              >
                Add files
              </Button>

              <Spacing mr={1} />

              <Button
                compact
                disabled={isEmptyObject(selectedFilesA)}
                secondary
                small
              >
                Checkout files
              </Button>
            </FlexContainer>
          </Spacing>

          {renderColumn(
            unstagedFilePaths,
            selectedFilesA,
            setSelectedFilesA,
            {
              ...modifiedFiles,
              ...untrackedFiles,
            },
            allFilesASelected,
          )}
        </Flex>

        <Spacing mr={PADDING_UNITS} />

        <Flex flexDirection="column">
          <Spacing mb={PADDING_UNITS}>
            <Headline>
              Staged files
            </Headline>
          </Spacing>

          <Spacing mb={1}>
            <FlexContainer flexDirection="row">
              <Button
                compact
                disabled={isEmptyObject(selectedFilesB)}
                secondary
                small
              >
                Reset files
              </Button>
            </FlexContainer>
          </Spacing>

          {renderColumn(
            stagedFilePaths,
            selectedFilesB,
            setSelectedFilesB,
            stagedFiles,
            allFilesBSelected,
          )}
        </Flex>
      </FlexContainer>
    </>
  );
}

export default GitFiles;
