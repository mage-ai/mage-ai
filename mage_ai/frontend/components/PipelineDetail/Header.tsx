import React, { useMemo } from 'react';

import Button from '@oracle/elements/Button';
import Develop from '@oracle/icons/custom/Develop';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Orchestrate from '@oracle/icons/custom/Orchestrate';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { DARK_CONTENT_MUTED } from '@oracle/styles/colors/content';
import { Folder } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';

const HEADER_BUTTONS = [
  {
    Icon: Develop,
    name: 'develop',
  },
  // TODO: Uncomment when orchestration UI is ready
  // {
  //   Icon: Orchestrate,
  //   name: 'jobs',
  // },
]

type HeaderProps = {
  page: string;
  projectName: string;
  setPage: (page: string) => void;
};

function Header({
  page,
  projectName,
  setPage,
}: HeaderProps) {

  const buttons = useMemo(() => (
    <>
      {HEADER_BUTTONS.map(({ Icon, name }) => {
        const selected = page === name;

        return (
          <Spacing ml={3}>
            <Button
              beforeIcon={<Icon fill={!selected && DARK_CONTENT_MUTED} size={2 * UNIT} />}
              highlightOnHover={!selected}
              noBackground={!selected}
              notClickable={selected}
              onClick={() => setPage(name)}
            >
              <Text color={!selected && DARK_CONTENT_MUTED}>
                {capitalize(name)}
              </Text>
            </Button>
          </Spacing>
        );
      })}
    </>
  ), [page]);

  return (
    <FlexContainer fullHeight alignItems="center">
      <Flex>
        <Folder size={2 * UNIT} />
        <Spacing ml={1} />
        <Text large monospace>
          {projectName}
        </Text>
      </Flex>
      {buttons}
    </FlexContainer>
  );
}

export default Header;
