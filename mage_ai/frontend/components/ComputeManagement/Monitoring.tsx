import moment from 'moment';
import { useMemo, useState } from 'react';

import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ComputeServiceEnum, ObjectAttributesType } from './constants';
import {
  DATE_FORMAT_LONG,
  dateFormatLongFromUnixTimestamp,
  datetimeInLocalTimezone,
} from '@utils/date';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  SparkApplicationType,
  SparkJobStatusEnum,
  SparkJobType,
  SparkStageAttemptType,
  SparkStageStatusEnum,
  SparkStageType,
  SparkTaskStatusEnum,
  SparkTaskType,
} from '@interfaces/SparkType';
import { formatNumberToDuration } from '@utils/string';
import { indexBy, sortByKey } from '@utils/array';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

type MonitoringProps = {
  objectAttributes: ObjectAttributesType;
  selectedComputeService?: ComputeServiceEnum;
};

function Monitoring({
  objectAttributes,
  selectedComputeService,
}: MonitoringProps) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const { data: dataApplications } = api.spark_applications.list();
  const applications: SparkApplicationType[] =
    useMemo(() => dataApplications?.spark_applications || [], [dataApplications]);

  const { data: dataJobs } = api.spark_jobs.list();
  const jobs: SparkJobType[] =
    useMemo(() => dataJobs?.spark_jobs || [], [dataJobs]);

  const { data: dataStages } = api.spark_stages.list({
    details: true,
    _format: 'with_details',
  });
  const stagesMapping: {
    [stageId: number]: SparkStageType;
  } = useMemo(() => indexBy(dataStages?.spark_stages || [], ({ stage_id: stageId }) => stageId), [
      dataStages,
    ]);

  const sharedTextProps: {
    default: boolean;
    monospace: boolean;
    small: boolean;
  } = useMemo(() => ({
    default: true,
    monospace: true,
    small: true,
  }), []);

  const applicationsMemo = useMemo(() => (
    <Table
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
          uuid: 'Version',
        },
        {
          uuid: 'Spark user',
        },
        {
          uuid: 'Started at',
        },
        {
          rightAligned: true,
          uuid: 'Last updated',
        },
      ]}
      rows={applications?.map(({
        attempts,
        id,
        name,
      }) => {
        const {
          app_spark_version: version,
          last_updated_epoch: lastUpdated,
          start_time_epoch: startTime,
          spark_user: sparkUser,
        } = attempts?.[0] || {};

        const startTimeUTCString = startTime && dateFormatLongFromUnixTimestamp(startTime / 1000, {
          withSeconds: true,
        });
        const startTimeString = startTimeUTCString && datetimeInLocalTimezone(
          startTimeUTCString,
          displayLocalTimezone,
        );

        return [
          <Text {...sharedTextProps} key="id">
            {id}
          </Text>,
          <Text {...sharedTextProps} key="name">
            {name}
          </Text>,
          <Text {...sharedTextProps} key="version">
            {version}
          </Text>,
          <Text {...sharedTextProps} key="sparkUser">
            {sparkUser}
          </Text>,
          <Text {...sharedTextProps} key="startTime">
            {startTimeString || '-'}
          </Text>,
          <Text {...sharedTextProps} key="lastUpdated" rightAligned>
            {lastUpdated
              ? datetimeInLocalTimezone(
                dateFormatLongFromUnixTimestamp(lastUpdated / 1000, {
                  withSeconds: true,
                }),
                displayLocalTimezone,
              )
              : '-'
             }
          </Text>,
        ];
      })}
      uuid="applications"
    />
  ), [
    applications,
    displayLocalTimezone,
    sharedTextProps,
  ]);

  const jobsMemo = useMemo(() => (
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
                      quantiles: '0.01,0.5,0.99',
                      withSummaries: true,
                    }]}
                    apiForFetchingAfterAction={api.spark_stages.detail}
                    renderExpandedRowWithObject={(rowIndex: number, object: SparkStageType) => {
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

                          {stageAttempts?.map(({
                            attemptId,
                            tasks,
                          }: SparkStageAttemptType) => {
                            return (
                              <>
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
                                  rows={sortByKey(Object.values(tasks || {}), ({ taskId }) => taskId, {
                                    ascending: false,
                                  }).map(({
                                    attempt,
                                    duration,
                                    // gettingResultTime,
                                    launchTime,
                                    schedulerDelay,
                                    status,
                                    taskId,
                                    taskLocality,
                                    taskMetrics,
                                  }: SparkTaskType) => {
                                    const arr = [
                                      <Text {...sharedTextProps} key="taskId">
                                        {taskId}
                                      </Text>,
                                      <Text {...sharedTextProps} center key="attempt">
                                        {attempt}
                                      </Text>,
                                      <Text
                                        {...sharedTextProps}
                                        key="status"
                                        success={SparkTaskStatusEnum.SUCCESS === status}
                                      >
                                        {status}
                                      </Text>,
                                      <Text {...sharedTextProps} key="taskLocality">
                                        {taskLocality}
                                      </Text>,
                                      <Text {...sharedTextProps} key="launchTime">
                                        {launchTime
                                          ? datetimeInLocalTimezone(
                                            moment(launchTime, 'YYYY-MM-DDTHH:mm:ss.SSSGMT').format(DATE_FORMAT_LONG),
                                            displayLocalTimezone,
                                          )
                                          : '-'
                                         }
                                      </Text>,
                                      <Text {...sharedTextProps} center key="duration">
                                        {duration ? formatNumberToDuration(duration) : 0}
                                      </Text>,
                                      <Text {...sharedTextProps} center key="jvmGcTime">
                                        {taskMetrics?.jvmGcTime ? formatNumberToDuration(taskMetrics?.jvmGcTime) : 0}
                                      </Text>,
                                      <Text {...sharedTextProps} center key="schedulerDelay">
                                        {schedulerDelay ? formatNumberToDuration(schedulerDelay) : 0}
                                      </Text>,
                                      <Text {...sharedTextProps} center key="resultSerializationTime">
                                        {taskMetrics?.resultSerializationTime ? formatNumberToDuration(taskMetrics?.resultSerializationTime) : 0}
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
                        moment(firstTaskLaunchedTime, 'YYYY-MM-DDTHH:mm:ss.SSSGMT');
                      const endTime = completionTime &&
                        moment(completionTime, 'YYYY-MM-DDTHH:mm:ss.SSSGMT')
                      let diffMs = endTime && endTime.diff(startTime);

                      const displayName = name?.length >= 12
                        ? `${name?.slice(0, 12 - 3)}...`
                        : name;

                      const arr = [
                        <Text {...sharedTextProps} key="stageID">
                          {stageID}
                        </Text>,
                        <Text {...sharedTextProps} center key="attemptID">
                          {attemptID}
                        </Text>,
                        <Text {...sharedTextProps} key="displayName" title={name}>
                          {displayName}
                        </Text>,
                        <Text {...sharedTextProps} key="submissionTime">
                          {submissionTime
                            ? datetimeInLocalTimezone(
                              moment(submissionTime, 'YYYY-MM-DDTHH:mm:ss.SSSGMT').format(DATE_FORMAT_LONG),
                              displayLocalTimezone,
                            )
                            : '-'
                           }
                        </Text>,
                        // <Text {...sharedTextProps} key="firstTaskLaunchedTime">
                        //   {firstTaskLaunchedTime
                        //     ? datetimeInLocalTimezone(
                        //       startTime.format(DATE_FORMAT_LONG),
                        //       displayLocalTimezone,
                        //     )
                        //     : '-'
                        //    }
                        // </Text>,
                        // <Text {...sharedTextProps} key="completionTime">
                        //   {completionTime
                        //     ? datetimeInLocalTimezone(
                        //       endTime.format(DATE_FORMAT_LONG),
                        //       displayLocalTimezone,
                        //     )
                        //     : '-'
                        //    }
                        // </Text>,
                        <Text {...sharedTextProps} key="diffDisplayText" center>
                          {diffMs ? formatNumberToDuration(diffMs) : 0}
                        </Text>,
                        <Text
                          {...sharedTextProps}
                          key="status"
                          success={SparkStageStatusEnum.COMPLETE === status}
                        >
                          {status}
                        </Text>,
                        <Text {...sharedTextProps} key="tasks" center>
                          {Object.keys(tasks || {}).length || 0}
                        </Text>,
                        <Text {...sharedTextProps} center key="inputBytes">
                          {inputBytes}
                        </Text>,
                        <Text {...sharedTextProps} center key="inputRecords">
                          {inputRecords}
                        </Text>,
                        <Text {...sharedTextProps} center key="outputBytes">
                          {outputBytes}
                        </Text>,
                        <Text {...sharedTextProps} center key="outputRecords">
                          {outputRecords}
                        </Text>,
                        <Text {...sharedTextProps} center key="shuffleReadBytes">
                          {shuffleReadBytes}
                        </Text>,
                        <Text {...sharedTextProps} key="shuffleWriteBytes" rightAligned>
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
          <Text {...sharedTextProps} key="id">
            {id}
          </Text>,
          <Text {...sharedTextProps} key="name" preWrap title={name}>
            {displayName}
          </Text>,
          <Text {...sharedTextProps} key="submittedAt">
            {submittedAt
              ? datetimeInLocalTimezone(
                moment(submittedAt, 'YYYY-MM-DDTHH:mm:ss.SSSGMT').format(DATE_FORMAT_LONG),
                displayLocalTimezone,
              )
              : '-'
             }
          </Text>,
          <Text {...sharedTextProps} key="status" success={SparkJobStatusEnum.SUCCEEDED === status}>
            {status}
          </Text>,
          <Text {...sharedTextProps} center key="stageIds">
            {stageIds?.length || '-'}
          </Text>,
          <Text {...sharedTextProps} center key="tasks">
            {tasks}
          </Text>,
        ];
      })}
      uuid="jobs"
    />
  ), [
    displayLocalTimezone,
    jobs,
    sharedTextProps,
    stagesMapping,
  ]);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <Headline level={4}>
          Applications&nbsp;&nbsp;&nbsp;<Headline
            default
            inline
            large
            level={4}
            monospace
          >
            {applications?.length}
          </Headline>
        </Headline>
      </Spacing>

      <Divider light />

      {applicationsMemo}

      <Spacing p={PADDING_UNITS}>
        <Headline level={4}>
          Jobs&nbsp;&nbsp;&nbsp;<Headline
            default
            inline
            large
            level={4}
            monospace
          >
            {jobs?.length}
          </Headline>
        </Headline>
      </Spacing>

      <Divider light />

      {jobsMemo}
    </>
  );
}

export default Monitoring;
