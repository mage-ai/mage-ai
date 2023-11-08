import { useMemo } from 'react';

import SparkJobSqls from '@components/ComputeManagement/SparkJobSqls';
import {
  SparkExecutionState,
  SparkStageType,
} from '@interfaces/SparkType';

type SparkSqlsType = {
  disableGraph?: boolean;
  executionStates: SparkExecutionState[];
  isInProgress?: boolean;
  overrideScrollForGraph?: boolean;
};

function SparkSqls({
  disableGraph,
  executionStates,
  isInProgress,
  overrideScrollForGraph,
}: SparkSqlsType) {
  const {
    sqls,
  } = executionStates?.[0]?.spark || {
    sqls: [],
  };

  const tableMemo = useMemo(() => (
    <SparkJobSqls
      disableGraph={disableGraph}
      disableJobExpansion
      overrideScrollForGraph={overrideScrollForGraph}
      showSparkGraph
      sqls={sqls}
    />
   ), [
    disableGraph,
    sqls,
  ]);

  return (
    <>
      {tableMemo}
    </>
  );
}

export default SparkSqls;
