import React, { useMemo, useState } from 'react';

import CreateSchedule from '@components/Orchestration/CreateSchedule';
import OrchestrationDetail from '@components/Orchestration/OrchestrationDetail';
import ScheduleLayout from '@components/ScheduleLayout';
import api from '@api';

type ScheduleDetailPageProps = {
  newSchedule: boolean;
  pipelineUUID: string;
  pipelineScheduleId?: string;
  subpath: string;
};

function ScheduleDetailPage({
  newSchedule,
  pipelineUUID,
  pipelineScheduleId,
  subpath,
}: ScheduleDetailPageProps) {
  // Variables
  const {
    data: dataGlobalVariables,
    mutate: fetchVariables,
  } = api.variables.pipelines.list(pipelineUUID);
  const globalVariables = dataGlobalVariables?.variables;

  const { data: pipelineScheduleData } = api.pipeline_schedules.detail(pipelineScheduleId);
  const pipelineSchedule = pipelineScheduleData?.pipeline_schedule;

  const [errors, setErrors] = useState(null);

  const {
    data,
    isLoading,
    mutate: fetchPipeline,
  } = api.pipelines.detail(pipelineUUID);
  const pipeline = data?.pipeline;

  const { data: filesData } = api.files.list();
  const projectName = useMemo(() => filesData?.files?.[0]?.name, [filesData]);

  const content = useMemo(() => {
    if (newSchedule) {
      return (
        <CreateSchedule
          pipeline={pipeline}
          setErrors={setErrors}
          variables={globalVariables}
        />
      );
    } else if (subpath === 'edit') {
      return (
        <CreateSchedule
          editSchedule
          pipeline={pipeline}
          pipelineSchedule={pipelineSchedule}
          setErrors={setErrors}
          variables={globalVariables}
        />
      );
    } else {
      return (
        <OrchestrationDetail
          pipeline={pipeline}
          pipelineSchedule={pipelineSchedule}
        />
      );
    }
  }, [
    globalVariables,
    newSchedule,
    pipeline,
    pipelineSchedule,
    setErrors,
    subpath,
  ])

  return (
    <ScheduleLayout
      errors={errors}
      pipeline={pipeline}
      pipelineSchedule={pipelineSchedule}
      projectName={projectName}
      setErrors={setErrors}
    >
      {content}
    </ScheduleLayout>
  )
}

ScheduleDetailPage.getInitialProps= async(ctx: any) => {
  const {
    pipeline: pipelineUUID,
    slug: slugArray,
  }: {
    pipeline: string,
    slug: string[],
  } = ctx.query;

  if (Array.isArray(slugArray)) {
    let pipelineScheduleId = slugArray[0];
    const newSchedule = pipelineScheduleId === 'new'
    if (pipelineScheduleId === 'new') {
      pipelineScheduleId = null;
    }
  
    const subpath = slugArray[1];
  
    return {
      newSchedule,
      pipelineUUID,
      pipelineScheduleId,
      subpath,
    }
  }

  return {
    newSchedule: true,
    pipelineUUID,
  }
}

export default ScheduleDetailPage;
