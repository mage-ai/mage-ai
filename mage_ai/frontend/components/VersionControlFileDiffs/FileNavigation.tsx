import { useMemo, useState } from 'react';

import Checkbox from '@oracle/elements/Checkbox';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { AlertTriangle, Check, IntegrationPipeline } from '@oracle/icons';
import { KeyValueType } from '@interfaces/CommandCenterType';
import { PADDING, PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { VersionControlFileType } from '@interfaces/VersionControlType';
import { pauseEvent } from '@utils/events';

const ICON_SIZE = 2 * UNIT;

function FileNavigation({
  files,
  refRows,
  selectedFiles,
  setSelectedFiles,
}: {
  files: VersionControlFileType[];
  refRows: {
    current: any[];
  };
  selectedFiles: KeyValueType;
  setSelectedFiles?: (prev: (data: any) => any) => any;
}) {


  const filesMemo = useMemo(() => {
    const arr = [];

    files?.forEach(({
      name,
      additions,
      deletions,
      staged,
      unstaged,
      untracked,
    }, idx) => {
      const selected = !!selectedFiles?.[name];

      arr.push(
        <Link
          block
          hoverBackground
          key={name}
          noOutline
          noHoverUnderline
          onClick={(e) => {
            e.preventDefault();

            refRows?.current?.[idx]?.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }}
          preventDefault
          selected={selected}
        >
          <FlexContainer
            alignItems="center"
            justifyContent="space-between"
            style={{ padding: 1 * UNIT }}
          >
            <Flex alignItems="center">
              {staged && !unstaged && <Check size={ICON_SIZE} success />}
              {unstaged && <IntegrationPipeline size={ICON_SIZE} warning />}
              {untracked && <AlertTriangle size={ICON_SIZE} danger />}

              <div style={{ paddingRight: 1.5 * UNIT }} />

              <FlexContainer alignItems="flex-start" flexDirection="column" justifyContent="flex-start">
                <Text>
                  {name}
                </Text>

                <FlexContainer flexDirection="row">
                  <Text monospace muted small>
                    {staged && !unstaged && 'Ready to commit'}
                    {unstaged && 'Modified'}
                    {untracked && 'Never committed before'}
                  </Text>
                  <div style={{ paddingRight: 1 * UNIT }} />
                  <Text success monospace small>
                    {additions ? `+${additions}` : <>&nbsp;</>}
                  </Text>
                  &nbsp;
                  <Text danger monospace small>
                    {deletions ? `-${deletions}` : <>&nbsp;</>}
                  </Text>
                </FlexContainer>
              </FlexContainer>
            </Flex>

            <div style={{ paddingRight: 1 * UNIT }} />

            <FlexContainer flexDirection="column" justifyContent="flex-end">
              <Checkbox
                checked={selected}
                onClick={(e) => {
                  pauseEvent(e);
                  setSelectedFiles((prev) => {
                    const value = {
                      ...prev,
                    };

                    if (name in prev) {
                      delete value[name];
                    } else {
                      value[name] = true;
                    }

                    return value;
                  });
                }}
              />

            </FlexContainer>
          </FlexContainer>

          <Divider light />
        </Link>
      );
    });

    return arr;
  }, [
    files,
    selectedFiles,
    setSelectedFiles,
  ]);

  return (
    <>
      {filesMemo}
    </>
  );
}

export default FileNavigation;
