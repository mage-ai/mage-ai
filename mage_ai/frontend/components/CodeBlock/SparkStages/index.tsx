import { useMemo } from 'react';

import ExecutionStateType from '@interfaces/ExecutionStateType';
import StagesTable from '@components/ComputeManagement/Stages/StagesTable';
import { SparkStageType } from '@interfaces/SparkType';

type SparkStagesType = {
  executionStates: ExecutionStateType[];
  isInProgress?: boolean;
};

function SparkStages({
  executionStates,
  isInProgress,
}: SparkStagesType) {
  const {
    stages,
  } = executionStates?.[0]?.spark || {
    stages: null,
  };

  const tableMemo = useMemo(() => (
    <StagesTable
      stages={stages}
      tasksContained
    />
   ), [
    stages,
  ]);

  return (
    <>
      {tableMemo}
    </>
  );
}

export default SparkStages;
