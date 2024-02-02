import React, { useMemo, useRef } from 'react';

import ErrorsType from '@interfaces/ErrorsType';
import PipelineLayout from '@components/PipelineLayout';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import PipelineType from '@interfaces/PipelineType';
import Sidebar from '@components/Orchestration/Sidebar';
import api from '@api';

type ScheduleLayoutProps = {
  children: any;
  errors: any;
  pipeline: PipelineType;
  pipelineSchedule: PipelineScheduleType;
  projectName: string;
  setErrors: (errors: ErrorsType) => void;
};

function ScheduleLayout({
  children,
  errors,
  pipeline,
  pipelineSchedule,
  projectName,
  setErrors,
}: ScheduleLayoutProps) {
  const pipelineUUID = pipeline?.uuid;

  const { data: pipelinesData, mutate: fetchPipelines } = api.pipelines.list();
  const pipelines = useMemo(() => pipelinesData?.pipelines, [pipelinesData]);

  const pipelineScheduleId = pipelineSchedule?.id;

  const { data: pipelineSchedulesData, mutate: fetchPipelineSchedules } = api.pipeline_schedules.list();
  const pipelineSchedules = useMemo(() => {
    const schedulesByPipeline = {};
    pipelines?.forEach(pipeline => schedulesByPipeline[pipeline.uuid] = []);
    pipelineSchedulesData
      ?.pipeline_schedules
      ?.forEach((schedule) => {
        const uuid = schedule?.pipeline_uuid;
        const currentSchedules = schedulesByPipeline[uuid];
        currentSchedules?.push(schedule);
        schedulesByPipeline[uuid] = currentSchedules;
      });
    return schedulesByPipeline;
  }, [pipelines, pipelineSchedulesData]);
  const mainContainerRef = useRef(null);

  const before = useMemo(() => (
    <Sidebar
      pipelineScheduleId={pipelineScheduleId}
      pipelineSchedules={pipelineSchedules}
      pipelineUuid={pipelineUUID}
    />
  ), [
    pipelineScheduleId,
    pipelineSchedules,
    pipelineUUID,
  ]);

  return (
    <PipelineLayout
      after={<div></div>}
      before={before}
      errors={errors}
      mainContainerRef={mainContainerRef}
      page="schedules"
      pipeline={pipeline}
      setErrors={setErrors}
    >
      {children}
    </PipelineLayout>
  )
}

export default ScheduleLayout;
