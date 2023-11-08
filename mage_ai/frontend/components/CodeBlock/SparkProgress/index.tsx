import { useMemo } from 'react';

import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ProgressDotsStyle } from './index.style';
import { SparkExecutionState, SparkStageStatusEnum } from '@interfaces/SparkType';

type SparkProgressProps = {
  children?: any;
  executionStates: SparkExecutionState[];
};

function SparkProgress({
  children,
  executionStates,
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
    completedTasks,
    tasks,
    completedStages,
    stagesCount,
    activeStages,
    activeTasks,
  } = useMemo(() => {
    let completedTasksInner = 0;
    let tasksInner = 0;
    let completedStagesInner = 0;
    let stagesInner = 0;

    let activeStagesInner = 0;
    let activeTasksInner = 0;

    jobs?.forEach(({
      num_completed_stages: numCompletedStages,
      num_completed_tasks: numCompletedTasks,
      num_active_stages: numActiveStages,
      num_active_tasks: numActivedTasks,
      num_skipped_stages: numSkippedStages,
      num_skipped_tasks: numSkippedTasks,
      num_tasks: numTasks,
      stage_ids: stageIDs,
      // status,
    }) => {
      if (SparkStageStatusEnum.SKIPPED !== status) {
      }
      completedTasksInner += numCompletedTasks;
      tasksInner += numTasks - (numSkippedTasks || 0);

      completedStagesInner += numCompletedStages;
      stagesInner += stageIDs?.length - (numSkippedStages || 0);
    });

    return {
      completedTasks: completedTasksInner,
      tasks: tasksInner,
      completedStages: completedStagesInner,
      stagesCount: stagesInner,
      activeStages: activeStagesInner,
      activeTasks: activeTasksInner,
    };
  }, [
    jobs,
  ]);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <ProgressDotsStyle
          width={100}
        />
      </Spacing>`

      <Text>
        {completedTasks} / {tasks} / {activeTasks}
      </Text>

      <Text>
        {completedStages} / {stagesCount} / {activeStages}
      </Text>

      {children}
    </>
  );
}

export default SparkProgress;
