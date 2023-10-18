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
  SparkStageStatusEnum,
  SparkStageType,
} from '@interfaces/SparkType';
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

  const { data: dataStages } = api.spark_stages.list();
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
      columnFlex={[
        null,
        1,
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
          uuid: 'Status',
        },
        {
          center: true,
          uuid: 'Tasks',
        },
        {
          rightAligned: true,
          uuid: 'Submitted',
        },
      ]}
      getObjectAtRowIndex={(rowIndex: number) => jobs?.[rowIndex]}
      buildApiOptionsFromObject={(object: any) => [object?.job_id]}
      apiForFetchingAfterAction={api.spark_jobs.detail}
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
                      <Spacing px={PADDING_UNITS} mb={1} pt={PADDING_UNITS}>
                        <Text bold large>
                          Stages
                        </Text>
                      </Spacing>

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
                      <Spacing px={PADDING_UNITS} mb={1} pt={PADDING_UNITS}>
                        <Text bold large>
                          Tasks
                        </Text>
                      </Spacing>

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
                      Stages
                    </Text>
                  </Spacing>

                  <Divider light />

                  <Table
                    columnFlex={[
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
                        uuid: 'Attempt ID',
                      },
                      {
                        uuid: 'Name',
                      },
                      {
                        uuid: 'Status',
                      },
                      {
                        uuid: 'Submitted',
                      },
                      {
                        uuid: 'Launched',
                      },
                      {
                        uuid: 'Completed',
                      },
                      {
                        rightAligned: true,
                        uuid: 'Duration',
                      },
                    ]}
                    getObjectAtRowIndex={(rowIndex: number) => stages?.[rowIndex]}
                    buildApiOptionsFromObject={(object: any) => [object?.stage_id, {
                      quantiles: '0.01,0.5,0.99',
                      withSummaries: true,
                    }]}
                    apiForFetchingAfterAction={api.spark_stages.detail}
                    renderExpandedRowWithObject={(rowIndex: number, object: any) => {
                      console.log('WTFFFFF', object)
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

                        peak_executor_metrics: peakExecutorMetrics,
                        rdd_ids: rddIds,
                      } = stage;

                      return (
                        <>
                          <Spacing p={PADDING_UNITS}>
                            <FlexContainer>
                              <Flex flex={1} alignItems="stretch">
                                <Panel noPadding>
                                  <Spacing px={PADDING_UNITS} mb={1} pt={PADDING_UNITS}>
                                    <Text bold>
                                      Tasks
                                    </Text>
                                  </Spacing>

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
                                  <Spacing px={PADDING_UNITS} pt={PADDING_UNITS}>
                                    <Text bold>
                                      Details
                                    </Text>
                                  </Spacing>

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
                        </>
                      );
                    }}
                    rows={stages?.map(({
                      attempt_id: attemptID,
                      completion_time: completionTime,
                      first_task_launched_time: firstTaskLaunchedTime,
                      name,
                      stage_id: stageID,
                      status: status,
                      submission_time: submissionTime,
                    }: SparkStageType) => {
                      const startTime = firstTaskLaunchedTime &&
                        moment(firstTaskLaunchedTime, 'YYYY-MM-DDTHH:mm:ss.SSSGMT');
                      const endTime = completionTime &&
                        moment(completionTime, 'YYYY-MM-DDTHH:mm:ss.SSSGMT')
                      let diffMs = endTime && endTime.diff(startTime);
                      let diffDisplayText;
                      if (diffMs) {
                        if (diffMs >= 1000 * 60 * 60) {
                          diffDisplayText = `${diffMs / (1000 * 60 * 60)}h`;
                        } else if (diffMs >= 1000 * 60) {
                          diffDisplayText = `${diffMs / (1000 * 60)}m`;
                        } else if (diffMs >= 1000) {
                          diffDisplayText = `${diffMs / (1000)}s`;
                        } else {
                          diffDisplayText = `${diffMs}ms`;
                        }
                      }

                      const displayName = name?.length >= 40
                        ? `${name?.slice(0, 40 - 3)}...`
                        : name;

                      const arr = [
                        <Text {...sharedTextProps} key="stageID">
                          {stageID}
                        </Text>,
                        <Text {...sharedTextProps} key="attemptID">
                          {attemptID}
                        </Text>,
                        <Text {...sharedTextProps} key="displayName" title={name}>
                          {displayName}
                        </Text>,
                        <Text
                          {...sharedTextProps}
                          key="status"
                          success={SparkStageStatusEnum.COMPLETE === status}
                        >
                          {status}
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
                        <Text {...sharedTextProps} key="firstTaskLaunchedTime">
                          {firstTaskLaunchedTime
                            ? datetimeInLocalTimezone(
                              startTime.format(DATE_FORMAT_LONG),
                              displayLocalTimezone,
                            )
                            : '-'
                           }
                        </Text>,
                        <Text {...sharedTextProps} key="completionTime">
                          {completionTime
                            ? datetimeInLocalTimezone(
                              endTime.format(DATE_FORMAT_LONG),
                              displayLocalTimezone,
                            )
                            : '-'
                           }
                        </Text>,
                        <Text {...sharedTextProps} key="diffDisplayText" rightAligned>
                          {diffDisplayText || '-'}
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
          <Text {...sharedTextProps} key="status" success={SparkJobStatusEnum.SUCCEEDED === status}>
            {status}
          </Text>,
          <Text {...sharedTextProps} center key="tasks">
            {tasks}
          </Text>,
          <Text {...sharedTextProps} key="submittedAt" rightAligned>
            {submittedAt
              ? datetimeInLocalTimezone(
                moment(submittedAt, 'YYYY-MM-DDTHH:mm:ss.SSSGMT').format(DATE_FORMAT_LONG),
                displayLocalTimezone,
              )
              : '-'
             }
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
        <Headline level={5}>
          Applications&nbsp;&nbsp;<Text inline monospace muted>
            /
          </Text>&nbsp;<Text
            inline
            large
            monospace
          >
            {applications?.length}
          </Text>
        </Headline>
      </Spacing>

      <Divider light />

      {applicationsMemo}

      <Spacing p={PADDING_UNITS}>
        <Headline level={5}>
          Jobs&nbsp;&nbsp;<Text inline monospace muted>
            /
          </Text>&nbsp;<Text
            inline
            large
            monospace
          >
            {jobs?.length}
          </Text>
        </Headline>
      </Spacing>

      <Divider light />

      {jobsMemo}
    </>
  );
}

export default Monitoring;
