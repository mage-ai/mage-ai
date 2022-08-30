import React, { useMemo } from 'react';

import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlexTable from '@oracle/components/FlexTable';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import PipelineType from '@interfaces/PipelineType';
import Router from 'next/router';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import { ChevronRight } from '@oracle/icons';
import { HeaderStyle } from './index.style';
import { LIME_DARK } from '@oracle/styles/colors/main';
import { UNIT } from '@oracle/styles/units/spacing';
import { queryFromUrl } from '@utils/url';

type OrchestrationDetailProps = {
  pipeline: PipelineType;
  pipelineSchedule: PipelineScheduleType;
}

function OrchestrationDetail({
  pipeline,
  pipelineSchedule,
}: OrchestrationDetailProps) {
  const {
    uuid: pipelineUuid,
  } = pipeline || {};
  const { data: pipelineRunsData } = api.pipeline_runs.pipeline_schedules.list(pipelineSchedule?.id);
  const pipelineRuns = pipelineRunsData?.pipeline_runs;

  const {
    id,
    name,
    schedule_interval,
    start_time,
  } = pipelineSchedule || {};

  const runData = useMemo(() => {
    if (pipelineRuns) {
      return pipelineRuns.map(pipelineRun => [
        <Text monospace muted>
          {pipelineRun?.execution_date}
        </Text>,
        <Text monospace muted>
          {pipelineRun?.status}
        </Text>,
        <Link
          onClick={() => console.log('show block runs')}
        >
          <FlexContainer justifyContent="end">
            <Text inline monospace muted>
              View
            </Text>
            <Spacing ml={1} />
            <ChevronRight size={2 * UNIT} muted />
          </FlexContainer>
        </Link>,
      ]);
    }
  }, [pipelineRuns])


  return (
    <>
      <HeaderStyle>
        <FlexContainer justifyContent="space-between">
          <FlexContainer>
            <div
              style={{
                height: '100%',
                width: '4px',
                backgroundColor: LIME_DARK,
                borderRadius: '2px',
                marginRight: `${2 * UNIT}px`,
              }}
            />
            <Flex flexDirection="column">
              <Headline
                level={3}
                monospace
              >
                {name}
              </Headline>
              <Text monospace muted>
                {schedule_interval} @ {start_time}
              </Text>
            </Flex>
          </FlexContainer>
          <Flex>
            <Button
              borderColor={dark.borders.dark}
              onClick={() => Router.push({
                pathname: `/pipelines/${pipelineUuid}/schedules/${id}/edit`,
                query: queryFromUrl(),
              })}
            >
              <Text monospace>
                Config
              </Text>
            </Button>
          </Flex>
        </FlexContainer>
      </HeaderStyle>
      <FlexTable
        columnFlex={[3, 1, 1]}
        columnHeaders={[
          <Text monospace muted>
            Executed on
          </Text>,
          <Text monospace muted>
            Status
          </Text>,
          <Text monospace muted>
            Blocks
          </Text>
        ]}
        paddingHorizontal={16}
        paddingVertical={16}
        rows={runData || []}
      />
    </>
  )
}

export default OrchestrationDetail;
