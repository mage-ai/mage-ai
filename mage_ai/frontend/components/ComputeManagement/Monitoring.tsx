import moment from 'moment';
import { ThemeContext } from 'styled-components';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import ComputeConnectionType from '@interfaces/ComputeConnectionType';
import ComputeServiceType, { ComputeServiceUUIDEnum } from '@interfaces/ComputeServiceType';
import ConnectionSettings from './ConnectionSettings';
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
import {
  MainNavigationTabEnum,
  ObjectAttributesType,
  SHARED_TEXT_PROPS,
} from './constants';
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
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { sortByKey } from '@utils/array';

const TAB_APPLICATIONS = 'Applications';
const TAB_CONNECTIONS = 'Connections';
const TAB_JOBS = 'Jobs';
const TAB_SQLS = 'SQLs';

type MonitoringProps = {
  applications: SparkApplicationType[];
  computeConnections?: ComputeConnectionType[];
  computeService?: ComputeServiceType;
  connectionsLoading?: boolean;
  fetchAll?: () => void;
  jobs?: SparkJobType[];
  loadingApplications?: boolean;
  loadingJobs?: boolean;
  objectAttributes: ObjectAttributesType;
  refButtonTabs?: any;
  selectedComputeService?: ComputeServiceUUIDEnum;
  setSelectedSql?: (prev: (sql: SparkSQLType) => SparkSQLType) => void;
  setSelectedTab?: (opts?: {
    main?: MainNavigationTabEnum;
  }) => void;
};

function Monitoring({
  applications,
  computeConnections,
  computeService,
  connectionsLoading,
  fetchAll,
  jobs,
  loadingApplications,
  loadingJobs,
  objectAttributes,
  refButtonTabs,
  selectedComputeService,
  setSelectedSql,
  setSelectedTab,
}: MonitoringProps) {
  const themeContext = useContext(ThemeContext);
  const [selectedSubheaderTabUUID, setSelectedSubheaderTabUUIDState] = useState();

  const setSelectedSubheaderTabUUID = useCallback((prev) => {
    setSelectedSql(() => null);
    setSelectedSubheaderTabUUIDState(prev);
  }, [
    setSelectedSql,
    setSelectedSubheaderTabUUIDState,
  ]);

  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const { data: dataStages } = api.spark_stages.list({
    details: true,
    _format: 'with_details',
  });
  const stagesMapping: {
    [applicationID: string]: {
      [stageID: number]: SparkStageType;
    };
  } = useMemo(() => (dataStages?.spark_stages || []).reduce((acc, stage) => {
    const application = stage?.application;

    if (!(application?.calculated_id in acc)) {
      acc[application?.calculated_id] = {};
    }

    acc[application?.calculated_id][stage?.stage_id] = stage;

    return acc;
  }, {}),
  [
    dataStages,
  ]);

  const connectionsMemo = useMemo(() => {
    return (
      <ConnectionSettings
        computeService={computeService}
        computeConnections={computeConnections}
        fetchAll={fetchAll}
        // @ts-ignore
        onClickStep={(tab: string) => setSelectedTab(() => ({
          // @ts-ignore
          main: tab,
        }))}
      />
    );
  }, [
    computeConnections,
    computeService,
    fetchAll,
    setSelectedTab,
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

  const jobsMemo = useMemo(() => {
    const groups = {};

    jobs?.forEach((job) => {
      const application = job?.application;
      if (!(application?.calculated_id in groups)) {
        groups[application?.calculated_id] = {
          application: application,
          jobs: [],
        };
      }

      groups[application?.calculated_id]?.jobs?.push(job);
    });

    return Object.values(groups).map(({
      application,
      jobs: jobsArr,
    }) => {
      return (
        <div key={application?.calculated_id}>
          <Spacing p={PADDING_UNITS}>
            <Text default bold>
              Application {application?.calculated_id}
            </Text>
          </Spacing>

          <Divider light />

          <JobsTable
            jobs={jobsArr}
            stagesMapping={stagesMapping}
          />
        </div>
      );
    });
  }, [
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

  const tabs = useMemo(() => {
    const arr = [
      {
        label: () => (
          <>
            {TAB_APPLICATIONS}&nbsp;&nbsp;&nbsp;{!loadingApplications ? applications?.length || 0 : ''}
          </>
        ),
        uuid: TAB_APPLICATIONS,
      },
      {
        label: () => (
          <>
            {TAB_JOBS}&nbsp;&nbsp;&nbsp;{!loadingJobs ? jobs?.length || 0 : ''}
          </>
        ),
        uuid: TAB_JOBS,
      },
      {
        label: () => TAB_SQLS,
        uuid: TAB_SQLS,
      },
    ];

    if (computeConnections?.length >= 1) {
      arr.unshift({
        label: () => TAB_CONNECTIONS,
        uuid: TAB_CONNECTIONS,
      });
    }

    return arr;
  }, [
    computeConnections,
    fetchAll,
  ]);

  useEffect(() => {
    if (!selectedSubheaderTabUUID && !connectionsLoading) {
      if (computeConnections?.length >= 1) {
        setSelectedSubheaderTabUUID(TAB_CONNECTIONS);
      } else {
        setSelectedSubheaderTabUUID(TAB_APPLICATIONS);
      }
    }
  }, [
    computeConnections,
    connectionsLoading,
    selectedSubheaderTabUUID,
    setSelectedSubheaderTabUUID,
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
          tabs={tabs}
          underlineColor={themeContext?.accent?.blue}
          underlineStyle
        />
      </Spacing>

      <Divider light />

      {TAB_CONNECTIONS === selectedSubheaderTabUUID && connectionsMemo}

      {TAB_APPLICATIONS === selectedSubheaderTabUUID && applicationsMemo}

      {TAB_JOBS === selectedSubheaderTabUUID && jobsMemo}

      {TAB_SQLS === selectedSubheaderTabUUID && sqlsMemo}
    </>
  );
}

export default Monitoring;
