import moment from 'moment';
import { useMemo } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel  from '@oracle/components/Accordion/AccordionPanel';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import JobsTable from './Jobs/JobsTable';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import SparkGraph from './SparkGraph';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  DATE_FORMAT_LONG,
  DATE_FORMAT_SPARK,
  dateFormatLongFromUnixTimestamp,
  datetimeInLocalTimezone,
} from '@utils/date';
import { MOCK_SQL } from './shared/mocks';
import { PADDING_UNITS, UNIT, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
import { SHARED_TEXT_PROPS } from './constants';
import { SparkStageType, SparkSQLStatusEnum, SparkSQLType, } from '@interfaces/SparkType';
import { formatNumberToDuration } from '@utils/string';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

type SparkJobSqlsProps = {
  disableGraph?: boolean;
  disableJobExpansion?: boolean;
  overrideScrollForGraph?: boolean;
  setSelectedSql?: (sql: SparkSQLType) => void;
  showSparkGraph?: boolean;
  sqls?: SparkSQLType[];
  stagesMapping?: {
    [applicationID: string]: {
      [stageID: number]: SparkStageType;
    };
  };
};

function SparkJobSqls({
  disableGraph,
  disableJobExpansion,
  overrideScrollForGraph,
  setSelectedSql,
  showSparkGraph,
  sqls: sqlsProp,
  stagesMapping,
}: SparkJobSqlsProps) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const { data: dataSqls } = api.spark_sqls.list({
    length: 9999,
  }, {}, {
    pauseFetch: typeof sqlsProp !== 'undefined' && sqlsProp !== null,
  });
  const sqlsArr: SparkSQLType[] = useMemo(() => sqlsProp ? sqlsProp : dataSqls?.spark_sqls || [], [
    dataSqls,
    sqlsProp,
  ]);

  const tableMemo = useMemo(() => {
    const groups = {};

    sqlsArr?.forEach((sql) => {
      const application = sql?.application;
      if (!(application?.calculated_id in groups)) {
        groups[application?.calculated_id] = {
          application: application,
          sqls: [],
        };
      }

      groups[application?.calculated_id]?.sqls?.push(sql);
    });

    const groupsCount = Object.values(groups)?.length;

    return Object.values(groups).map(({
      application,
      sqls,
    }) => {
      return (
        <div key={application?.calculated_id}>
          {groupsCount >= 2 && (
            <>
              <Spacing p={PADDING_UNITS}>
                <Text default bold>
                  Application {application?.calculated_id}
                </Text>
              </Spacing>

              <Divider light />
            </>
          )}

          <Table
            apiForFetchingAfterAction={api.spark_sqls.detail}
            buildApiOptionsFromObject={(object: any) => [object?.id, {
              application_id: object?.application?.calculated_id
                ? encodeURIComponent(object?.application?.calculated_id)
                : '',
              application_spark_ui_url: object?.application?.spark_ui_url
                ? encodeURIComponent(object?.application?.spark_ui_url)
                : '',
              include_jobs_and_stages: 1,
              _format: 'with_jobs_and_stages',
            }]}
            columnFlex={[null, null, null, null, null, null, null]}
            columns={[
              {
                uuid: 'ID',
              },
              {
                uuid: 'Submitted',
              },
              {
                center: true,
                uuid: 'Duration',
              },
              {
                uuid: 'Status',
              },
              {
                center: true,
                uuid: 'Successful jobs',
              },
              {
                center: true,
                uuid: 'Running jobs',
              },
              {
                center: true,
                uuid: 'Failed jobs',
              },
            ]}
            getObjectAtRowIndex={(rowIndex: number) => sqls?.[rowIndex]}
            onClickRow={(rowIndex: number) => {
              const sql = sqls?.[rowIndex];
              // @ts-ignore
              setSelectedSql?.(prev => {
                if (!prev || prev?.id !== sql?.id) {
                  return sql;
                }

                return null;
              });
            }}
            renderExpandedRowWithObject={(rowIndex: number, object: any) => {
              const jobs = object?.spark_sql?.jobs;
              const sql = sqls?.[rowIndex];

              return (
                <>
                  <Spacing p={PADDING_UNITS}>
                    <Panel noPadding>
                      <Spacing p={PADDING_UNITS}>
                        <FlexContainer
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Flex flex={1} flexDirection="column">
                            <Headline level={5}>
                              Description
                            </Headline>

                            <Spacing mt={1}>
                              <Text default monospace>
                                {sql?.description}
                              </Text>
                            </Spacing>
                          </Flex>
                        </FlexContainer>
                      </Spacing>

                      <Spacing p={PADDING_UNITS}>
                        <Accordion
                          noBoxShadow
                        >
                          <AccordionPanel
                            noPaddingContent
                            title="Plan"
                            titleXPadding={PADDING_UNITS * UNIT}
                            titleYPadding={1.5 * UNIT}
                          >
                            <Spacing p={PADDING_UNITS}>
                              <Text default monospace preWrap small>
                                {sql?.plan_description}
                              </Text>
                            </Spacing>
                          </AccordionPanel>

                          {showSparkGraph && (
                            <AccordionPanel
                              noPaddingContent
                              title="Graph"
                              titleXPadding={PADDING_UNITS * UNIT}
                              titleYPadding={1.5 * UNIT}
                            >
                              <SparkGraph
                                disableGraph={disableGraph}
                                height={100 * UNIT}
                                model={sql}
                                overrideScroll={overrideScrollForGraph}
                              />
                            </AccordionPanel>
                          )}
                        </Accordion>
                      </Spacing>
                    </Panel>
                  </Spacing>

                  <Spacing mb={PADDING_UNITS} px={PADDING_UNITS}>
                    <Spacing mb={PADDING_UNITS}>
                      <FlexContainer
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Flex flex={1} flexDirection="column">
                          <Headline level={5}>
                            Jobs
                          </Headline>
                        </Flex>
                      </FlexContainer>
                    </Spacing>

                    <Panel overflowVisible noPadding>
                      <JobsTable
                        disableJobExpansion={disableJobExpansion}
                        jobs={jobs}
                        stagesMapping={stagesMapping}
                      />
                      <Spacing pb={PADDING_UNITS} />
                    </Panel>
                  </Spacing>
                </>
              );
            }}
            rows={sqls?.map(({
              duration,
              failed_job_ids: failedJobIds,
              id,
              running_job_ids: runningJobIds,
              status,
              submission_time: submissionTime,
              success_job_ids: successJobIds,
            }) => {
              const arr = [
                <Text {...SHARED_TEXT_PROPS} key="id">
                  {id}
                </Text>,
                <Text {...SHARED_TEXT_PROPS} key="submissionTime">
                  {submissionTime
                    ? datetimeInLocalTimezone(
                      moment(submissionTime, DATE_FORMAT_SPARK).format(DATE_FORMAT_LONG),
                      displayLocalTimezone,
                    )
                    : '-'
                   }
                </Text>,
                <Text {...SHARED_TEXT_PROPS} center key="duration">
                  {duration ? formatNumberToDuration(duration) : 0}
                </Text>,
                <Text
                  {...SHARED_TEXT_PROPS}
                  key="status"
                  success={SparkSQLStatusEnum.COMPLETED === status}
                >
                  {status}
                </Text>,
                <Text {...SHARED_TEXT_PROPS} center key="successJobIds">
                  {successJobIds?.length}
                </Text>,
                <Text {...SHARED_TEXT_PROPS} center key="runningJobIds">
                  {runningJobIds?.length}
                </Text>,
                <Text {...SHARED_TEXT_PROPS} center key="failedJobIds">
                  {failedJobIds?.length}
                </Text>,
              ];

              return arr;
            })}
          />
        </div>
      );
    })
  }, [
    disableGraph,
    overrideScrollForGraph,
    sqlsArr,
    stagesMapping,
  ]);

  return (
    <>
      {tableMemo}
    </>
  );
}

export default SparkJobSqls;
