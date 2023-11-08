import { useMemo } from 'react';

import ExecutionStateType from '@interfaces/ExecutionStateType';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ProgressDotsStyle } from './index.style';
import {
  SparkJobStatusEnum,
  SparkStageStatusEnum,
} from '@interfaces/SparkType';

type SparkProgressProps = {
  children?: any;
  executionStates: ExecutionStateType[];
  isInProgress?: boolean;
};

function SparkProgress({
  children,
  executionStates,
  isInProgress,
}: SparkProgressProps) {
  const {
    jobs,
    sqls,
    stages,
  } = executionStates?.[0]?.spark || {
    jobs: null,
    sqls: null,
    stages: null,
  };

  const {
    jobsCountCompleted,
    jobsCount,
    stagesCount,
    stagesCountCompleted,
    tasksCount,
    tasksCountCompleted,
  } = useMemo(() => {
    let jobsCountCompletedInner = 0;
    let jobsCountInner = 0;
    let stagesCountCompletedInner = 0;
    let stagesCountInner = 0;

    jobs?.forEach(({
      num_completed_stages: stagesCountCompleted,
      status,
    }) => {
      jobsCountCompletedInner += SparkJobStatusEnum.SUCCEEDED === status ? 1 : 0;
      jobsCountInner += 1;
    });

    let tasksCountCompletedInner = 0;
    let tasksCountInner = 0;

    stages?.forEach(({
      num_complete_tasks: tasksCountCompleted,
      num_tasks: tasks,
      status,
    }) => {
      if (SparkStageStatusEnum.SKIPPED !== status) {
        stagesCountCompletedInner += SparkStageStatusEnum.COMPLETE === status ? 1 : 0;
        stagesCountInner += 1;
        tasksCountCompletedInner += tasksCountCompleted || 0;
        tasksCountInner += tasks || 0;
      }
    });

    return {
      jobsCountCompleted: jobsCountCompletedInner,
      jobsCount: jobsCountInner,
      stagesCount: stagesCountInner,
      stagesCountCompleted: stagesCountCompletedInner,
      tasksCount: tasksCountInner,
      tasksCountCompleted: tasksCountCompletedInner,
    };
  }, [
    jobs,
    stages,
  ]);

  const jobsProgress = useMemo(() => !jobsCount
    ? 0
    : Math.min(isInProgress ? 90 : 1, jobsCountCompleted / jobsCount),
  [
    isInProgress,
    jobsCount,
    jobsCountCompleted,
  ]);

  const stagesProgress = useMemo(() => !stagesCount
    ? 0
    : Math.min(jobsProgress < 1 ? 90 : 1, stagesCountCompleted / stagesCount),
  [
    jobsProgress,
    stagesCount,
    stagesCountCompleted,
  ]);

  const tasksProgress = useMemo(() => !tasksCount
    ? 0
    : Math.min(jobsProgress < 1 ? 90 : 1, tasksCountCompleted / tasksCount),
  [
    jobsProgress,
    tasksCount,
    tasksCountCompleted,
  ]);

  if (!isInProgress && !jobsCount) {
    return null;
  }

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <Spacing mb={1}>
          <FlexContainer alignContent="center" justifyContent="space-between">
            <Text default monospace small>
              Jobs
            </Text>
            <Spacing mr={PADDING_UNITS} />
            <Text default monospace small>
              {jobsCountCompleted} / {jobsCount} ({Math.round(jobsProgress * 100)}%)
            </Text>
          </FlexContainer>
        </Spacing>
        <FlexContainer>
          <ProgressDotsStyle
            progress={jobsProgress * 100}
            success
          />
          {jobsProgress > 0 && jobsProgress < 1 && <div style={{ width: UNIT / 2 }} />}
          <ProgressDotsStyle
            progress={(1 - jobsProgress) * 100}
          />
        </FlexContainer>
      </Spacing>

      <Spacing px={PADDING_UNITS} pb={PADDING_UNITS}>
        <Spacing mb={1}>
          <FlexContainer alignContent="center" justifyContent="space-between">
            <Text default monospace small>
              Stages
            </Text>
            <Spacing mr={PADDING_UNITS} />
            <Text default monospace small>
              {stagesCountCompleted} / {stagesCount} ({Math.round(stagesProgress * 100)}%)
            </Text>
          </FlexContainer>
        </Spacing>
        <FlexContainer>
          <ProgressDotsStyle
            progress={stagesProgress * 100}
            success
          />
          {stagesProgress > 0 && stagesProgress < 1 && <div style={{ width: UNIT / 2 }} />}
          <ProgressDotsStyle
            progress={(1 - stagesProgress) * 100}
          />
        </FlexContainer>
      </Spacing>

      <Spacing px={PADDING_UNITS} pb={PADDING_UNITS}>
        <Spacing mb={1}>
          <FlexContainer alignContent="center" justifyContent="space-between">
            <Text default monospace small>
              Tasks
            </Text>
            <Spacing mr={PADDING_UNITS} />
            <Text default monospace small>
              {tasksCountCompleted} / {tasksCount} ({Math.round(tasksProgress * 100)}%)
            </Text>
          </FlexContainer>
        </Spacing>
        <FlexContainer>
          <ProgressDotsStyle
            progress={tasksProgress * 100}
            success
          />
          {tasksProgress > 0 && tasksProgress < 1 && <div style={{ width: UNIT / 2 }} />}
          <ProgressDotsStyle
            progress={(1 - tasksProgress) * 100}
          />
        </FlexContainer>
      </Spacing>

      {children}
    </>
  );
}

export default SparkProgress;
