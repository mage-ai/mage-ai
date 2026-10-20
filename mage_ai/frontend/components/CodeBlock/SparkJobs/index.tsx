import { useMemo } from 'react';

import ExecutionStateType from '@interfaces/ExecutionStateType';
import JobsTable from '@components/ComputeManagement/Jobs/JobsTable';
import { SparkStageType } from '@interfaces/SparkType';

type SparkJobsType = {
  executionStates: ExecutionStateType[];
  isInProgress?: boolean;
};

function SparkJobs({
  executionStates,
  isInProgress,
}: SparkJobsType) {
  const {
    jobs,
    sqls,
    stages,
  } = executionStates?.[0]?.spark || {
    jobs: null,
    sqls: null,
    stages: null,
  };

  const stagesMapping: {
    [applicationID: string]: {
      [stageID: number]: SparkStageType;
    };
  } = useMemo(() => (stages || []).reduce((acc, stage) => {
    const application = stage?.application;

    if (!(application?.calculated_id in acc)) {
      acc[application?.calculated_id] = {};
    }

    acc[application?.calculated_id][stage?.stage_id] = stage;

    return acc;
  }, {}),
  [
    stages,
  ]);

  const jobsMemo = useMemo(() => (
    <JobsTable
      disableStageExpansion
      jobs={jobs}
      stagesMapping={stagesMapping}
    />
   ), [
    jobs,
    stagesMapping,
  ]);

  return (
    <>
      {jobsMemo}
    </>
  );
}

export default SparkJobs;
