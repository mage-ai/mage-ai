import moment from 'moment';

import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import TasksWaterfallChart from '../TasksWaterfallChart';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import {
  DATE_FORMAT_LONG_MS,
  DATE_FORMAT_SPARK,
  dateFormatLongFromUnixTimestamp,
  datetimeInLocalTimezone,
} from '@utils/date';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SHARED_TEXT_PROPS } from '../constants';
import {
  SparkApplicationType,
  SparkJobStatusEnum,
  SparkJobType,
  SparkSQLType,
  SparkStageAttemptType,
  SparkStageStatusEnum,
  SparkStageType,
  SparkTaskStatusEnum,
  SparkTaskType,
} from '@interfaces/SparkType';
import { formatNumberToDuration, pluralize } from '@utils/string';
import { indexBy, sortByKey } from '@utils/array';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

function JobsTable({
  jobs,
  stagesMapping,
}) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  return (
    <Table
      apiForFetchingAfterAction={api.spark_jobs.detail}
      buildApiOptionsFromObject={(object: any) => [object?.job_id]}
      columnFlex={[
        null,
        null,
        null,
        null,
        null,
        null,
      ]}
      columns={[
        {
          uuid: 'ID',
        },
        {
          uuid: 'Name',
        },
        {
          uuid: 'Submitted',
        },
        {
          uuid: 'Status',
        },
        {
          center: true,
          uuid: 'Stages',
        },
        {
          center: true,
          uuid: 'Tasks',
        },
      ]}
      getObjectAtRowIndex={(rowIndex: number) => jobs?.[rowIndex]}
      renderExpandedRowWithObject={(rowIndex: number, object: any) => {
        const job = object?.spark_job;
        if (job) {
          const {
            num_active_stages: numActiveStages,
            num_active_tasks: numActiveTasks,
            num_completed_stages: numCompletedStages,
            num_completed_tasks: numCompletedTasks,
            num_failed_stages: numFailedStages,
            num_failed_tasks: numFailedTasks,
            num_killed_tasks: numKilledTasks,
            num_skipped_stages: numSkippedStages,
            num_skipped_tasks: numSkippedTasks,
            num_tasks: numTasks,
            stage_ids: stageIds,
          } = job;

          const stages: SparkStageType[] = sortByKey(stageIds, stageId => stageId, {
            ascending: false,
          }).reduce((acc, stageId: number) => {
            const stage = stagesMapping?.[stageId];
            if (stage){
              return acc.concat(stage);
            }

            return stage;
          }, []);

          const buildTable = (rows) => (
            <Table
              columnFlex={[
                null,
                1,
              ]}
              columns={[
                {
                  uuid: 'Attribute',
                },
                {
                  uuid: 'Value',
                },
              ]}
              rows={rows.map((arr) => [
                <Text
                  key="attribute"
                  monospace
                  muted
                  small
                >
                  {arr[0]}
                </Text>,
                <Text
                  key="value"
                  monospace
                  muted
                  small
                >
                  {arr[1]}
                </Text>,
              ])}
            />
          );

          return (
            <>
              <Spacing p={PADDING_UNITS}>
                <FlexContainer>
                  <Flex flex={1} alignItems="stretch">
                    <Panel noPadding>
                      <Spacing px={PADDING_UNITS} py={PADDING_UNITS}>
                        <Text bold large>
                          Stage summary
                        </Text>
                      </Spacing>

                      <Divider light short />

                      {buildTable([
                        ['IDs', stageIds?.join(', ')],
                        ['Completed', numCompletedStages],
                        ['Active', numActiveStages],
                        ['Skipped', numSkippedStages],
                        ['Failed', numFailedStages],
                      ])}
                    </Panel>
                  </Flex>

                  <Spacing mr={PADDING_UNITS} />

                  <Flex flex={1} alignItems="stretch">
                    <Panel noPadding>
                      <Spacing px={PADDING_UNITS} py={PADDING_UNITS}>
                        <Text bold large>
                          Task summary
                        </Text>
                      </Spacing>

                      <Divider light short />

                      {buildTable([
                        ['Total', numTasks],
                        ['Completed', numCompletedTasks],
                        ['Active', numActiveTasks],
                        ['Skipped', numSkippedTasks],
                        ['Failed', numFailedTasks],
                        ['Killed', numKilledTasks],
                      ])}
                    </Panel>
                  </Flex>
                </FlexContainer>
              </Spacing>

              <Divider light />

              <Spacing p={PADDING_UNITS}>
                <Panel noPadding>
                  <Spacing p={PADDING_UNITS}>
                    <Text bold large>
                      Stages&nbsp;&nbsp;&nbsp;<Text
                        default
                        inline
                        large
                        monospace
                      >
                        {stages?.length}
                      </Text>
                    </Text>
                  </Spacing>

                  <Divider light />

                  <Table
                    columnFlex={[
                      null,
                      null,
                      null,
                      null,
                      // null,
                      // null,
                      null,
                      null,
                      null,
                      null,
                      null,
                      null,
                      null,
                      null,
                      null,
                    ]}
                    columns={[
                      {
                        uuid: 'ID',
                      },
                      {
                        center: true,
                        uuid: 'Attempt',
                      },
                      {
                        uuid: 'Name',
                      },
                      {
                        uuid: 'Submitted',
                      },
                      // {
                      //   uuid: 'Launched',
                      // },
                      // {
                      //   uuid: 'Completed',
                      // },
                      {
                        center: true,
                        uuid: 'Duration',
                      },
                      {
                        uuid: 'Status',
                      },
                      {
                        center: true,
                        uuid: 'Tasks',
                      },
                      {
                        center: true,
                        tooltipMessage: 'Bytes read from storage in this stage',
                        uuid: 'In',
                      },
                      {
                        center: true,
                        uuid: 'In recs',
                      },
                      {
                        center: true,
                        tooltipMessage: 'Bytes written in storage in this stage',
                        uuid: 'Out',
                      },
                      {
                        center: true,
                        uuid: 'Out recs',
                      },
                      {
                        center: true,
                        tooltipMessage: 'Total shuffle bytes and records read, includes both data read locally and data read from remote executors.',
                        uuid: 'Sh read',
                      },
                      {
                        rightAligned: true,
                        tooltipMessage: 'Bytes and records written to disk in order to be read by a shuffle in a future stage.',
                        uuid: 'Sh write',
                      },
                    ]}
                    getObjectAtRowIndex={(rowIndex: number) => stages?.[rowIndex]}
                    buildApiOptionsFromObject={(object: any) => [object?.stage_id, {
                      quantiles: '0.01,0.25,0.5,0.75,0.99',
                      withSummaries: true,
                    }]}
                    apiForFetchingAfterAction={api.spark_stages.detail}
                    renderExpandedRowWithObject={(rowIndex: number, object: {
                      spark_stage: SparkStageType;
                    }) => {
                      const stage = stages?.[rowIndex];

                      if (!stage) {
                        return <div />;
                      }

                      const {
                        details,
                        num_active_tasks: numActiveTasks,
                        num_complete_tasks: numCompleteTasks,
                        num_failed_tasks: numFailedTasks,
                        num_killed_tasks: numKilledTasks,
                        num_tasks: numTasks,
                      } = stage;

                      const stageAttempts: SparkStageAttemptType[] = object?.spark_stage?.stage_attempts;

                      return (
                        <>
                          <Spacing p={PADDING_UNITS}>
                            <FlexContainer>
                              <Flex flex={1} alignItems="stretch">
                                <Panel noPadding>
                                  <Spacing px={PADDING_UNITS} py={PADDING_UNITS}>
                                    <Text bold large>
                                      Task summary
                                    </Text>
                                  </Spacing>

                                  <Divider light short />

                                  {buildTable([
                                    ['Total', numTasks],
                                    ['Completed', numCompleteTasks],
                                    ['Active', numActiveTasks],
                                    ['Failed', numFailedTasks],
                                    ['Killed', numKilledTasks],
                                  ])}
                                </Panel>
                              </Flex>

                              <Spacing mr={PADDING_UNITS} />

                              <Flex flex={2} alignItems="stretch">
                                <Panel noPadding>
                                  <Spacing px={PADDING_UNITS} py={PADDING_UNITS}>
                                    <Text bold large>
                                      Details
                                    </Text>
                                  </Spacing>

                                  <Divider light short />

                                  <Spacing p={PADDING_UNITS}>
                                    {details?.split('\n')?.map((line: string) => (
                                      <Text key={line} muted monospace small>
                                        {line}
                                      </Text>
                                    ))}
                                  </Spacing>
                                </Panel>
                              </Flex>
                            </FlexContainer>
                          </Spacing>

                          {stageAttempts?.map((stageAttempt: SparkStageType) => {
                            const {
                              attempt_id: attemptId,
                              task_metrics_distributions: taskMetricsDistributions,
                              tasks: tasks,
                            } = stageAttempt;

                            const {
                              input_metrics: inputMetrics,
                              output_metrics: outputMetrics,
                              quantiles: quantiles,
                              shuffle_read_metrics: shuffleReadMetrics,
                              shuffle_write_metrics: shuffleWriteMetrics,
                            } = taskMetricsDistributions || {};

                            return (
                              <>
                                <Divider light />

                                <Spacing p={PADDING_UNITS}>
                                  <TasksWaterfallChart
                                    stageAttempt={stageAttempt}
                                  />
                                </Spacing>

                                <Divider light />

                                <Spacing p={PADDING_UNITS}>
                                  <FlexContainer>
                                    <Flex flex={1} alignItems="stretch">
                                      <Panel noPadding>
                                        <Spacing px={PADDING_UNITS} py={PADDING_UNITS}>
                                          <Text bold large>
                                            Summary metrics for {pluralize(
                                              'completed task',
                                              stageAttempt?.num_complete_tasks,
                                            )}
                                          </Text>
                                        </Spacing>

                                        <Divider light short />

                                        <Table
                                          columnFlex={[null].concat(quantiles?.map(() => null))}
                                          columns={[
                                            {
                                              uuid: 'Metric',
                                            },
                                            // @ts-ignore
                                          ].concat(quantiles?.map((quantile: number, idx: number) => ({
                                            center: true,
                                            label: () => idx === 0
                                              ? 'Min'
                                              : idx === quantiles?.length - 1
                                                ? 'Max'
                                                : idx === Math.floor(quantiles?.length / 2)
                                                  ? 'Median'
                                                  : `${Number(quantile * 100)}th`,
                                            uuid: quantile,
                                          })) || [])}
                                          rows={[
                                            {
                                              uuid: 'Duration',
                                              values: (taskMetricsDistributions?.duration || []).map(v => formatNumberToDuration(v)),
                                            },
                                            {
                                              tooltipMessage: 'GC time is the total JVM garbage collection time.',
                                              uuid: 'GC time',
                                              values: (taskMetricsDistributions?.jvm_gc_time || []).map(v => formatNumberToDuration(v)),
                                            },
                                            {
                                              tooltipMessage: 'Bytes read from storage in this stage.',
                                              uuid: 'Input read (bytes)',
                                              values: inputMetrics?.bytes_read || [],
                                            },
                                            {
                                              tooltipMessage: 'Records read from storage in this stage.',
                                              uuid: 'Input records read',
                                              values: inputMetrics?.records_read || [],
                                            },
                                            {
                                              tooltipMessage: 'Total shuffle bytes read, includes both data read locally and data read from remote executors.',
                                              uuid: 'Shuffle read (bytes)',
                                              values: shuffleReadMetrics?.read_bytes || [],
                                            },
                                            {
                                              tooltipMessage: 'Total shuffle records read, includes both data read locally and data read from remote executors.',
                                              uuid: 'Shuffle read records',
                                              values: shuffleReadMetrics?.read_records || [],
                                            },
                                            {
                                              uuid: 'Shuffle read fetch time',
                                              values: (shuffleReadMetrics?.fetch_wait_time || []).map(v => formatNumberToDuration(v)),
                                            },
                                            {
                                              tooltipMessage: 'Bytes written to storage in this stage.',
                                              uuid: 'Input write (bytes)',
                                              values: outputMetrics?.bytes_written || [],
                                            },
                                            {
                                              tooltipMessage: 'Records written to storage in this stage.',
                                              uuid: 'Input records write',
                                              values: outputMetrics?.records_written || [],
                                            },
                                            {
                                              tooltipMessage: 'Bytes written to disk in order to be read by a shuffle in a future stage.',
                                              uuid: 'Shuffle write (bytes)',
                                              values: shuffleWriteMetrics?.write_bytes || [],
                                            },
                                            {
                                              tooltipMessage: 'Records written to disk in order to be read by a shuffle in a future stage.',
                                              uuid: 'Shuffle write records',
                                              values: shuffleWriteMetrics?.write_records || [],
                                            },
                                            {
                                              uuid: 'Shuffle write time',
                                              values: (shuffleWriteMetrics?.write_time || []).map(v => formatNumberToDuration(v)),
                                            },
                                            {
                                              tooltipMessage: 'Scheduler delay is the time the task waits to be scheduled for execution.',
                                              uuid: 'Scheduler delay',
                                              values: taskMetricsDistributions?.scheduler_delay || [],
                                            },
                                            {
                                              uuid: 'Task deserialization time',
                                              values: (taskMetricsDistributions?.executor_deserialize_time || []).map(v => formatNumberToDuration(v)),
                                            },
                                            {
                                              uuid: 'Task deserialization CPU time',
                                              values: (taskMetricsDistributions?.executor_deserialize_cpu_time || []).map(v => formatNumberToDuration(v)),
                                            },
                                            {
                                              uuid: 'Result size',
                                              values: taskMetricsDistributions?.result_size || [],
                                            },
                                            {
                                              tooltipMessage: 'Result serialization time is the time spent serializing the task result on an executor before sending it back to the driver.',
                                              uuid: 'Result serialization time',
                                              values: (taskMetricsDistributions?.result_serialization_time || []).map(v => formatNumberToDuration(v)),
                                            },
                                            {
                                              tooltipMessage: 'Getting result time is the time that the driver spends fetching task results from workers.',
                                              uuid: 'Getting result time',
                                              values: (taskMetricsDistributions?.getting_result_time || []).map(v => formatNumberToDuration(v)),
                                            },
                                            {
                                              tooltipMessage: 'Scheduler delay is the time the task waits to be scheduled for execution.',
                                              uuid: 'Scheduler delay',
                                              values: (taskMetricsDistributions?.scheduler_delay || []).map(v => formatNumberToDuration(v)),
                                            },
                                            {
                                              tooltipMessage: 'Peak execution memory is the maximum memory used by the internal data structures created during shuffles, aggregations and joins.',
                                              uuid: 'Peak execution memory',
                                              values: taskMetricsDistributions?.peak_execution_memory || [],
                                            },
                                            {
                                              tooltipMessage: 'Shuffle spill (memory) is the size of the deserialized form of the shuffled data in memory.',
                                              uuid: 'Memory spilled (bytes)',
                                              values: taskMetricsDistributions?.memory_bytes_spilled || [],
                                            },
                                            {
                                              tooltipMessage: 'Shuffle spill (disk) is the size of the serialized form of the data on disk.',
                                              uuid: 'Disk spilled (bytes)',
                                              values: taskMetricsDistributions?.disk_bytes_spilled || [],
                                            },
                                          ].map(({
                                            tooltipMessage,
                                            uuid,
                                            values,
                                          }) => [
                                            <FlexContainer alignItems="center" key={uuid}>
                                              <Text {...SHARED_TEXT_PROPS}>
                                                {uuid}
                                              </Text>

                                              {tooltipMessage && (
                                                <div style={{ marginLeft: 4 }}>
                                                  <Tooltip
                                                    appearAbove
                                                    label={(
                                                      <Text leftAligned>
                                                        {tooltipMessage}
                                                      </Text>
                                                    )}
                                                    lightBackground
                                                    maxWidth={200}
                                                    muted
                                                  />
                                                </div>
                                              )}
                                            </FlexContainer>,
                                            // @ts-ignore
                                          ].concat(values?.map((value: number, idx: number) => (
                                            <Text {...SHARED_TEXT_PROPS} center key={`quantile-${quantiles[idx]}-${uuid}`}>
                                              {value}
                                            </Text>
                                          ))))}
                                        />

                                        <Spacing p={1} />
                                      </Panel>
                                    </Flex>
                                  </FlexContainer>
                                </Spacing>

                                <Spacing p={PADDING_UNITS}>
                                  <Text bold large>
                                    Tasks&nbsp;&nbsp;&nbsp;<Text
                                    default
                                    inline
                                    large
                                    monospace
                                  >
                                    {tasks ? Object.keys(tasks || {})?.length : ''}
                                  </Text>
                                  </Text>
                                </Spacing>

                                <Divider light />

                                <Table
                                  columnFlex={[null, null, null, null, null, null, null, null, null]}
                                  columns={[
                                    {
                                      uuid: 'ID',
                                    },
                                    {
                                      center: true,
                                      uuid: 'Attempt',
                                    },
                                    {
                                      uuid: 'Status',
                                    },
                                    {
                                      uuid: 'Locality',
                                    },
                                    {
                                      uuid: 'Launch',
                                    },
                                    {
                                      center: true,
                                      uuid: 'Duration',
                                    },
                                    {
                                      center: true,
                                      tooltipMessage: 'GC time is the total JVM garbage collection time.',
                                      uuid: 'GC time',
                                    },
                                    {
                                      center: true,
                                      tooltipMessage: 'Scheduler delay is the time the task waits to be scheduled for execution.',
                                      uuid: 'Delayed',
                                    },
                                    {
                                      center: true,
                                      tooltipMessage: 'Result serialization time is the time spent serializing the task result on an executor before sending it back to the driver.',
                                      uuid: 'Result time',
                                    },
                                  ]}
                                  rows={sortByKey(Object.values(tasks || {}), ({ task_id: taskId }) => taskId, {
                                    ascending: false,
                                  }).map(({
                                    attempt,
                                    duration,
                                    launch_time: launchTime,
                                    scheduler_delay: schedulerDelay,
                                    status,
                                    task_id: taskId,
                                    task_locality: taskLocality,
                                    task_metrics: taskMetrics,
                                  }: SparkTaskType) => {
                                    const arr = [
                                      <Text {...SHARED_TEXT_PROPS} key="taskId">
                                        {taskId}
                                      </Text>,
                                      <Text {...SHARED_TEXT_PROPS} center key="attempt">
                                        {attempt}
                                      </Text>,
                                      <Text
                                        {...SHARED_TEXT_PROPS}
                                        key="status"
                                        success={SparkTaskStatusEnum.SUCCESS === status}
                                      >
                                        {status}
                                      </Text>,
                                      <Text {...SHARED_TEXT_PROPS} key="taskLocality">
                                        {taskLocality}
                                      </Text>,
                                      <Text {...SHARED_TEXT_PROPS} key="launchTime">
                                        {launchTime
                                          ? datetimeInLocalTimezone(
                                            moment(launchTime, DATE_FORMAT_SPARK).format(DATE_FORMAT_LONG_MS),
                                            displayLocalTimezone,
                                          )
                                          : '-'
                                         }
                                      </Text>,
                                      <Text {...SHARED_TEXT_PROPS} center key="duration">
                                        {duration ? formatNumberToDuration(duration) : 0}
                                      </Text>,
                                      <Text {...SHARED_TEXT_PROPS} center key="jvmGcTime">
                                        {taskMetrics?.jvm_gc_time ? formatNumberToDuration(taskMetrics?.jvm_gc_time) : 0}
                                      </Text>,
                                      <Text {...SHARED_TEXT_PROPS} center key="schedulerDelay">
                                        {schedulerDelay ? formatNumberToDuration(schedulerDelay) : 0}
                                      </Text>,
                                      <Text {...SHARED_TEXT_PROPS} center key="resultSerializationTime">
                                        {taskMetrics?.result_serialization_time ? formatNumberToDuration(taskMetrics?.result_serialization_time) : 0}
                                      </Text>,
                                    ];

                                    return arr;
                                  })}
                                />

                                <Spacing p={1} />
                              </>
                            );
                          })}
                        </>
                      );
                    }}
                    rows={stages?.map(({
                      attempt_id: attemptID,
                      completion_time: completionTime,
                      first_task_launched_time: firstTaskLaunchedTime,
                      input_bytes: inputBytes,
                      input_records: inputRecords,
                      name,
                      output_bytes: outputBytes,
                      output_records: outputRecords,
                      shuffle_read_bytes: shuffleReadBytes,
                      shuffle_write_bytes: shuffleWriteBytes,
                      stage_id: stageID,
                      status: status,
                      submission_time: submissionTime,
                      tasks,
                    }: SparkStageType) => {
                      const startTime = firstTaskLaunchedTime &&
                        moment(firstTaskLaunchedTime, DATE_FORMAT_SPARK);
                      const endTime = completionTime &&
                        moment(completionTime, DATE_FORMAT_SPARK)
                      let diffMs = endTime && endTime.diff(startTime);

                      const displayName = name?.length >= 12
                        ? `${name?.slice(0, 12 - 3)}...`
                        : name;

                      const arr = [
                        <Text {...SHARED_TEXT_PROPS} key="stageID">
                          {stageID}
                        </Text>,
                        <Text {...SHARED_TEXT_PROPS} center key="attemptID">
                          {attemptID}
                        </Text>,
                        <Text {...SHARED_TEXT_PROPS} key="displayName" title={name}>
                          {displayName}
                        </Text>,
                        <Text {...SHARED_TEXT_PROPS} key="submissionTime">
                          {submissionTime
                            ? datetimeInLocalTimezone(
                              moment(submissionTime, DATE_FORMAT_SPARK).format(DATE_FORMAT_LONG_MS),
                              displayLocalTimezone,
                            )
                            : '-'
                           }
                        </Text>,
                        // <Text {...SHARED_TEXT_PROPS} key="firstTaskLaunchedTime">
                        //   {firstTaskLaunchedTime
                        //     ? datetimeInLocalTimezone(
                        //       startTime.format(DATE_FORMAT_LONG_MS),
                        //       displayLocalTimezone,
                        //     )
                        //     : '-'
                        //    }
                        // </Text>,
                        // <Text {...SHARED_TEXT_PROPS} key="completionTime">
                        //   {completionTime
                        //     ? datetimeInLocalTimezone(
                        //       endTime.format(DATE_FORMAT_LONG_MS),
                        //       displayLocalTimezone,
                        //     )
                        //     : '-'
                        //    }
                        // </Text>,
                        <Text {...SHARED_TEXT_PROPS} key="diffDisplayText" center>
                          {diffMs ? formatNumberToDuration(diffMs) : 0}
                        </Text>,
                        <Text
                          {...SHARED_TEXT_PROPS}
                          key="status"
                          success={SparkStageStatusEnum.COMPLETE === status}
                        >
                          {status}
                        </Text>,
                        <Text {...SHARED_TEXT_PROPS} key="tasks" center>
                          {Object.keys(tasks || {}).length || 0}
                        </Text>,
                        <Text {...SHARED_TEXT_PROPS} center key="inputBytes">
                          {inputBytes}
                        </Text>,
                        <Text {...SHARED_TEXT_PROPS} center key="inputRecords">
                          {inputRecords}
                        </Text>,
                        <Text {...SHARED_TEXT_PROPS} center key="outputBytes">
                          {outputBytes}
                        </Text>,
                        <Text {...SHARED_TEXT_PROPS} center key="outputRecords">
                          {outputRecords}
                        </Text>,
                        <Text {...SHARED_TEXT_PROPS} center key="shuffleReadBytes">
                          {shuffleReadBytes}
                        </Text>,
                        <Text {...SHARED_TEXT_PROPS} key="shuffleWriteBytes" rightAligned>
                          {shuffleWriteBytes}
                        </Text>,
                      ];

                      return arr;
                    })}
                  />

                  <Spacing p={PADDING_UNITS} />
                </Panel>
              </Spacing>
            </>
          );
        }

        return (
          <Spacing p={PADDING_UNITS}>
          </Spacing>
        );
      }}
      rows={jobs?.map(({
        job_id: id,
        name,
        num_tasks: tasks,
        stage_ids: stageIds,
        status,
        submission_time: submittedAt,
      }) => {
        const displayName = name?.length >= 100
          ? `${name?.slice(0, 100 - 3)}...`
          : name;

        return [
          <Text {...SHARED_TEXT_PROPS} key="id">
            {id}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} key="name" preWrap title={name}>
            {displayName}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} key="submittedAt">
            {submittedAt
              ? datetimeInLocalTimezone(
                moment(submittedAt, DATE_FORMAT_SPARK).format(DATE_FORMAT_LONG_MS),
                displayLocalTimezone,
              )
              : '-'
             }
          </Text>,
          <Text
            {...SHARED_TEXT_PROPS}
            danger={SparkJobStatusEnum.FAILED === status}
            key="status"
            success={SparkJobStatusEnum.SUCCEEDED === status}
          >
            {status}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} center key="stageIds">
            {stageIds?.length || '-'}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} center key="tasks">
            {tasks}
          </Text>,
        ];
      })}
      uuid="jobs"
    />
  );
}

export default JobsTable;
