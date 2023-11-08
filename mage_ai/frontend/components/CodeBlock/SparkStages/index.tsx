import { useMemo } from 'react';

import StagesTable from '@components/ComputeManagement/Stages/StagesTable';
import {
  SparkExecutionState,
  SparkStageType,
} from '@interfaces/SparkType';

type SparkStagesType = {
  executionStates: SparkExecutionState[];
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
