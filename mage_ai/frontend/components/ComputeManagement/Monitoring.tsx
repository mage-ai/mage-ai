import moment from 'moment';
import { useMemo, useState } from 'react';

import Divider from '@oracle/elements/Divider';
import Headline from '@oracle/elements/Headline';
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
} from '@interfaces/SparkType';
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

  const [selectedRowIndexJob, setSelectedRowIndexJob] = useState<number>(null);

  const { data: dataApplications } = api.spark_applications.list();
  const applications: SparkApplicationType[] =
    useMemo(() => dataApplications?.spark_applications || [], [dataApplications]);

  const { data: dataJobs } = api.spark_jobs.list();
  const jobs: SparkJobType[] =
    useMemo(() => dataJobs?.spark_jobs || [], [dataJobs]);

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
          center: true,
          uuid: 'Active',
        },
        {
          center: true,
          uuid: 'Completed',
        },
        {
          center: true,
          uuid: 'Skipped',
        },
        {
          center: true,
          uuid: 'Killed',
        },
        {
          center: true,
          uuid: 'Failed',
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
          return (
            <Headline>
              {job?.name}
            </Headline>
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
        num_active_stages: activeStages,
        num_active_tasks: activeTasks,
        num_completed_indices: completedIndices,
        num_completed_stages: completedStages,
        num_completed_tasks: completedTasks,
        num_failed_stages: failedStages,
        num_failed_tasks: failedTasks,
        num_killed_tasks: killedTasks,
        num_skipped_stages: skippedStages,
        num_skipped_tasks: skippedTasks,
        num_tasks: tasks,
        status,
        submission_time: submittedAt,
      }) => {
        const displayName = name?.length >= 34
          ? `${name?.slice(0, 31)}...`
          : name;

        return [
          <Text {...sharedTextProps} key="id">
            {id}
          </Text>,
          <Text {...sharedTextProps} key="name" title={name}>
            {displayName}
          </Text>,
          <Text {...sharedTextProps} key="status" success={SparkJobStatusEnum.SUCCEEDED === status}>
            {status}
          </Text>,
          <Text {...sharedTextProps} center key="tasks">
            {tasks}
          </Text>,
          <Text {...sharedTextProps} center key="activeTasks">
            {activeTasks}
          </Text>,
          <Text {...sharedTextProps} center key="completedTasks">
            {completedTasks}
          </Text>,
          <Text {...sharedTextProps} center key="skippedTasks">
            {skippedTasks}
          </Text>,
          <Text {...sharedTextProps} center key="killedTasks">
            {killedTasks}
          </Text>,
          <Text {...sharedTextProps} center key="failedTasks">
            {failedTasks}
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
    // selectedRowIndexJob,
    // setSelectedRowIndexJob,
    sharedTextProps,
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
