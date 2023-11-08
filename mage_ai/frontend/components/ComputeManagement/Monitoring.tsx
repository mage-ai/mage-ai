import moment from 'moment';
import { ThemeContext } from 'styled-components';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import JobsTable from './Jobs/JobsTable';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import SparkJobSqls from './SparkJobSqls';
import Table from '@components/shared/Table';
import TasksWaterfallChart from './TasksWaterfallChart';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import { ComputeServiceEnum, ObjectAttributesType, SHARED_TEXT_PROPS } from './constants';
import {
  DATE_FORMAT_LONG,
  DATE_FORMAT_SPARK,
  dateFormatLongFromUnixTimestamp,
  datetimeInLocalTimezone,
} from '@utils/date';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
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

const TAB_APPLICATIONS = 'Applications';
const TAB_JOBS = 'Jobs';
const TAB_SQLS = 'SQLs';

type MonitoringProps = {
  objectAttributes: ObjectAttributesType;
  refButtonTabs?: any;
  selectedComputeService?: ComputeServiceEnum;
  setSelectedSql?: (prev: (sql: SparkSQLType) => SparkSQLType) => void;
};

function Monitoring({
  objectAttributes,
  refButtonTabs,
  selectedComputeService,
  setSelectedSql,
}: MonitoringProps) {
  const themeContext = useContext(ThemeContext);
  const [selectedSubheaderTabUUID, setSelectedSubheaderTabUUIDState] = useState(TAB_JOBS);

  const setSelectedSubheaderTabUUID = useCallback((prev) => {
    setSelectedSql(() => null);
    setSelectedSubheaderTabUUIDState(prev);
  }, [
    setSelectedSql,
    setSelectedSubheaderTabUUIDState,
  ]);

  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const { data: dataApplications } = api.spark_applications.list();
  const applications: SparkApplicationType[] =
    useMemo(() => dataApplications?.spark_applications, [dataApplications]);

  const { data: dataJobs } = api.spark_jobs.list();
  const jobs: SparkJobType[] =
    useMemo(() => dataJobs?.spark_jobs, [dataJobs]);

  const { data: dataStages } = api.spark_stages.list({
    details: true,
    _format: 'with_details',
  });
  const stagesMapping: {
    [stageId: number]: SparkStageType;
  } = useMemo(() => indexBy(dataStages?.spark_stages || [], ({ stage_id: stageId }) => stageId), [
      dataStages,
    ]);

  const applicationsMemo = useMemo(() => (
    <Table
      columnFlex={[
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
          uuid: 'URL',
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
        spark_ui_url: sparkUIURL,
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
          <Text {...SHARED_TEXT_PROPS} key="id">
            {id}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} key="sparkUIURL">
            {sparkUIURL}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} key="name">
            {name}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} key="version">
            {version}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} key="sparkUser">
            {sparkUser}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} key="startTime">
            {startTimeString || '-'}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} key="lastUpdated" rightAligned>
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
  ]);

  const jobsMemo = useMemo(() => (
    <JobsTable
      jobs={jobs}
      stagesMapping={stagesMapping}
    />
  ), [
    jobs,
    stagesMapping,
  ]);

  const sqlsMemo = useMemo(() => (
    <SparkJobSqls
      // @ts-ignore
      setSelectedSql={setSelectedSql}
      stagesMapping={stagesMapping}
    />
  ), [
    setSelectedSql,
    stagesMapping,
  ]);

  return (
    <>
      <Spacing px={PADDING_UNITS}>
        <ButtonTabs
          noPadding
          onClickTab={({ uuid }) => setSelectedSubheaderTabUUID(uuid)}
          ref={refButtonTabs}
          regularSizeText
          selectedTabUUID={selectedSubheaderTabUUID}
          tabs={[
            {
              label: () => (
                <>
                  {TAB_APPLICATIONS}&nbsp;&nbsp;&nbsp;{dataApplications ? applications?.length || 0 : ''}
                </>
              ),
              uuid: TAB_APPLICATIONS,
            },
            {
              label: () => (
                <>
                  {TAB_JOBS}&nbsp;&nbsp;&nbsp;{dataJobs ? jobs?.length || 0 : ''}
                </>
              ),
              uuid: TAB_JOBS,
            },
            {
              label: () => TAB_SQLS,
              uuid: TAB_SQLS,
            },
          ]}
          underlineColor={themeContext?.accent?.blue}
          underlineStyle
        />
      </Spacing>

      <Divider light />

      {TAB_APPLICATIONS === selectedSubheaderTabUUID && applicationsMemo}

      {TAB_JOBS === selectedSubheaderTabUUID && jobsMemo}

      {TAB_SQLS === selectedSubheaderTabUUID && sqlsMemo}
    </>
  );
}

export default Monitoring;
