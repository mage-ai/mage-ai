import React, { useMemo } from 'react';
import Router, { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Develop from '@oracle/icons/custom/Develop';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Orchestrate from '@oracle/icons/custom/Orchestrate';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { DARK_CONTENT_MUTED } from '@oracle/styles/colors/content';
import { Folder } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';

type HeaderProps = {
  page: string;
  pipeline: PipelineType;
  projectName: string;
};

function Header({
  page,
  pipeline,
  projectName,
}: HeaderProps) {
  const router = useRouter();
  const queryParams = router.query;

  const headerButtons = useMemo(
    () => ([
      {
        Icon: Develop,
        name: 'develop',
        onClick: () => {
          Router.push({
            pathname: `/pipelines/${pipeline.uuid}`,
          });
        }
      },
      // TODO: Uncomment when jobs is ready.
      // {
      //   Icon: Orchestrate,
      //   name: 'schedules',
      //   onClick: () => {
      //     Router.push({
      //       pathname: `/pipelines/${pipeline.uuid}/schedules/new`,
      //     });
      //   }
      // },
    ]),
    [queryParams, pipeline],
  );


  const buttons = useMemo(() => (
    <>
      {headerButtons.map(({ Icon, name, onClick }) => {
        const selected = page === name;

        return (
          <Spacing ml={3}>
            <Button
              beforeIcon={<Icon fill={!selected && DARK_CONTENT_MUTED} size={2 * UNIT} />}
              highlightOnHover={!selected}
              noBackground={!selected}
              notClickable={selected}
              onClick={onClick}
            >
              <Text color={!selected && DARK_CONTENT_MUTED}>
                {capitalize(name)}
              </Text>
            </Button>
          </Spacing>
        );
      })}
    </>
  ), [headerButtons, page]);

  return (
    <FlexContainer fullHeight alignItems="center">
      <Flex alignItems="center">
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
