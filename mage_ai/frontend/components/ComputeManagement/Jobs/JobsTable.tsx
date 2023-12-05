import moment from 'moment';

import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import StagesTable from '../Stages/StagesTable';
import Table from '@components/shared/Table';
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
import { buildTable } from '../utils';
import { formatNumberToDuration, pluralize } from '@utils/string';
import { indexBy, sortByKey } from '@utils/array';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

type JobsTableProps = {
  disableJobExpansion?: boolean;
  disableStageExpansion?: boolean;
  jobs: SparkJobType[];
  stagesMapping: {
    [applicationID: string]: {
      [stageID: number]: SparkStageType;
    };
  };
};

function JobsTable({
  disableJobExpansion,
  disableStageExpansion,
  jobs,
  stagesMapping,
}: JobsTableProps) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  return (
    <Table
      apiForFetchingAfterAction={!disableJobExpansion ? api.spark_jobs.detail : null}
      buildApiOptionsFromObject={!disableJobExpansion
        ? (object: any) => [object?.job_id, {
          application_id: object?.application?.calculated_id
            ? encodeURIComponent(object?.application?.calculated_id)
            : '',
          application_spark_ui_url: object?.application?.spark_ui_url
            ? encodeURIComponent(object?.application?.spark_ui_url)
            : '',
        }]
        : null
      }
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
      renderExpandedRowWithObject={!disableJobExpansion
        ? (rowIndex: number, object: any) => {
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
              const stage = stagesMapping?.[job?.application?.calculated_id]?.[stageId];
              if (stage){
                return acc.concat(stage);
              }

              return stage;
            }, []);

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

                    <StagesTable
                      disableStageExpansion={disableStageExpansion}
                      stages={stages}
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
        }
        : null
      }
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
