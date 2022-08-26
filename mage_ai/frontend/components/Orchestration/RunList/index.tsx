import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import PipelineType from '@interfaces/PipelineType';
import React from 'react';
import api from '@api';
import FlexContainer from '@oracle/components/FlexContainer';
import Flex from '@oracle/components/Flex';
import Headline from '@oracle/elements/Headline';
import Text from '@oracle/elements/Text';
import styled from 'styled-components';

const HeaderBarStyle = styled.div`
  height: 100%;
  width: 4px;
  background-color: green;
  border-radius: 2px;
`;

type RunListProps = {
  pipeline: PipelineType;
  pipelineSchedule: PipelineScheduleType;
}

function RunList({
  pipeline,
  pipelineSchedule,
}: RunListProps) {
  const { data: pipelineRunsData } = api.pipeline_runs.pipeline_schedules(pipelineSchedule?.id);
  const pipelineRuns = pipelineRunsData?.pipeline_runs;

  const {
    name,
    schedule_interval,
    start_time,
  } = pipelineSchedule;


  return (
    <>
      <FlexContainer justifyContent="space-between">
        <FlexContainer>
          <HeaderBarStyle />
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
      </FlexContainer>
    </>
  )
}