import {
  SparkJobType,
  SparkSQLType,
  SparkStageType,
} from './SparkType';

export default interface ExecutionStateType {
  spark?: {
    jobs: SparkJobType[];
    sqls: SparkSQLType[];
    stages: SparkStageType[];
  };
}
