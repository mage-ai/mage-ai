import React, { useMemo } from 'react';

import CreateSchedule from './CreateSchedule';
import PipelineType from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import api from '@api';
import styled from 'styled-components';
import { ASIDE_HEADER_HEIGHT } from '@components/TripleLayout/index.style';

const ContainerStyle = styled.div`
  // height: 100vh - ${ASIDE_HEADER_HEIGHT}px;
`;

type OrchestrationProps = {
  newPipelineSchedule: boolean;
  pipeline: PipelineType;
  pipelineScheduleAction?: string;
  pipelineScheduleId?: string;
  setErrors?: (errors: any) => void;
  variables?: PipelineVariableType[];
};

function Orchestration({
  newPipelineSchedule,
  pipeline,
  pipelineScheduleAction,
  pipelineScheduleId,
  setErrors,
  variables,
}: OrchestrationProps) {
  const { data: pipelineScheduleData } = api.pipeline_schedules.detail(pipelineScheduleId);
  const pipelineSchedule = pipelineScheduleData?.pipeline_schedule;

  const createScheduleMemo = useMemo(() => (
    <>
      {newPipelineSchedule && (
        <CreateSchedule
          pipeline={pipeline}
          setErrors={setErrors}
          variables={variables}
        />
      )}
      {!newPipelineSchedule && (
        <CreateSchedule
          editSchedule
          pipeline={pipeline}
          pipelineSchedule={pipelineSchedule}
          setErrors={setErrors}
          variables={variables}
        />
      )}
    </>
  ), [
    newPipelineSchedule,
    pipeline,
    pipelineSchedule,
    setErrors,
    variables,
  ])

  return (
    <ContainerStyle>
      {!pipelineScheduleAction && createScheduleMemo}
    </ContainerStyle>
  );
}

export default Orchestration;
