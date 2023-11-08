import { useMemo } from 'react';

import SparkJobSqls from '@components/ComputeManagement/SparkJobSqls';
import {
  SparkExecutionState,
  SparkStageType,
} from '@interfaces/SparkType';

type SparkSqlsType = {
  executionStates: SparkExecutionState[];
  isInProgress?: boolean;
};

function SparkSqls({
  executionStates,
  isInProgress,
}: SparkSqlsType) {
  const {
    sqls,
  } = executionStates?.[0]?.spark || {
    sqls: [],
  };

  const tableMemo = useMemo(() => (
    <SparkJobSqls
      disableJobExpansion
      showSparkGraph
      sqls={sqls}
    />
   ), [
    sqls,
  ]);

  return (
    <>
      {tableMemo}
    </>
  );
}

export default SparkSqls;
