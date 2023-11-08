import { useMemo } from 'react';

import Divider from '@oracle/elements/Divider';
import JobsTable from '@components/ComputeManagement/Jobs/JobsTable';
import {
  SparkExecutionState,
  SparkStageType,
} from '@interfaces/SparkType';

type SparkJobsType = {
  executionStates: SparkExecutionState[];
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
    [applicationID: string]: SparkStageType;
  } = useMemo(() => (stages || []).reduce((acc, stage) => {
    const application = stage?.application;

    if (!(application?.id in acc)) {
      acc[application?.id] = {};
    }

    acc[application?.id][stage?.stage_id] = stage;

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
      <Divider light />
      {jobsMemo}
    </>
  );
}

export default SparkJobs;
