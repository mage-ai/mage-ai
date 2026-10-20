import React, { useMemo, useState } from 'react';
import NextLink from 'next/link';
import moment from 'moment';
import styled from 'styled-components';

import BarStackChart from '@components/charts/BarStack';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Monitor from '@components/Monitor';
import PipelineType from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  BAR_STACK_COLORS,
  BAR_STACK_STATUSES,
  MonitorTypeEnum,
  TOOLTIP_LEFT_OFFSET,
} from '@components/Monitor/constants';
import { ChevronRight } from '@oracle/icons';
import { SCHEDULE_TYPE_TO_LABEL } from '@interfaces/PipelineScheduleType';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';
import { getAllPipelineRunData } from '@components/PipelineRun/shared/utils';
import { getDateRange } from '@utils/date';

const GradientTextStyle = styled.div<any>`
  background: linear-gradient(90deg, #7D55EC 28.12%, #2AB2FE 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
`;

type PipelineRunsMonitorProps = {
  pipeline: PipelineType;
};

function PipelineRunsMonitor({
  pipeline: pipelineProp,
}: PipelineRunsMonitorProps) {
  const pipelineUUID = pipelineProp.uuid;
  const [errors, setErrors] = useState<ErrorsType>(null);

  const { data: dataPipelineSchedules } = api.pipeline_schedules.pipelines.list(pipelineUUID);
  const pipelineSchedules = useMemo(
    () => dataPipelineSchedules?.pipeline_schedules,
    [dataPipelineSchedules],
  );

  const pipelineSchedulesById = useMemo(() => pipelineSchedules?.reduce(
    (obj, pipelineSchedule) => ({
      ...obj,
      [pipelineSchedule?.id]: pipelineSchedule,
    }),
    {},
  ), [pipelineSchedules]);

  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID, {
    includes_content: false,
    includes_outputs: false,
  }, {
    revalidateOnFocus: false,
  });
  const pipeline = useMemo(() => ({
    ...dataPipeline?.pipeline,
    uuid: pipelineUUID,
  }), [
    dataPipeline,
    pipelineUUID,
  ]);

  const { data: dataMonitor } = api.monitor_stats.detail(
    'pipeline_run_count',
    {
      pipeline_uuid: pipeline?.uuid,
    },
  );

  const {
    stats: monitorStats,
  } = dataMonitor?.monitor_stat || {};

  const dateRange = useMemo(() => getDateRange(), []);
  const totalPipelineRunData = useMemo(() => getAllPipelineRunData(monitorStats, dateRange), [
    dateRange,
    monitorStats,
  ]);

  const pipelineRunsData = useMemo(() => {
    if (monitorStats) {
      return Object.entries(monitorStats).reduce(
        // @ts-ignore
        (obj, [id, { data: scheduleStats }]) => {
          const updated = dateRange.map(date => ({
            date,
            ...(scheduleStats[date] || {}),
          }));
          return {
            ...obj,
            [id]: updated,
          };
        },
        {},
      );
    }
  }, [
    dateRange,
    monitorStats,
  ]);

  const breadcrumbs = useMemo(() => {
    const arr = [];

    arr.push({
      bold: true,
      label: () => 'Monitors',
    });

    return arr;
  }, []);

  return (
    <Monitor
      breadcrumbs={breadcrumbs}
      errors={errors}
      monitorType={MonitorTypeEnum.PIPELINE_RUNS}
      pipeline={pipeline}
      setErrors={setErrors}
    >
      <Spacing mt={2} mx={2}>
        <Spacing ml={1}>
          <GradientTextStyle>
            <Headline>
              All pipeline runs
            </Headline>
          </GradientTextStyle>
        </Spacing>
        <Spacing mt={1}>
          <BarStackChart
            colors={BAR_STACK_COLORS}
            data={totalPipelineRunData}
            getXValue={(data) => data['date']}
            height={200}
            keys={BAR_STACK_STATUSES}
            margin={{
              bottom: 30,
              left: 35,
              right: 0,
              top: 10,
            }}
            tooltipLeftOffset={TOOLTIP_LEFT_OFFSET}
            xLabelFormat={(label: number) => moment(label).format('MMM DD')}
          />
        </Spacing>
        {pipelineRunsData && Object.entries(pipelineRunsData).map(([id, stats]) => {
          const pipelineSchedule = pipelineSchedulesById?.[id];
          return (
            <Spacing key={id} mt={3}>
              <FlexContainer alignItems="center">
                <Spacing mx={1}>
                  <GradientTextStyle>
                    <Text bold large>
                      {capitalize(SCHEDULE_TYPE_TO_LABEL[pipelineSchedule?.schedule_type]?.())}
                    </Text>
                  </GradientTextStyle>
                </Spacing>
                <NextLink
                  as={`/pipelines/${pipelineUUID}/triggers/${pipelineSchedule?.id}`}
                  href="/pipelines/[pipeline]/triggers/[...slug]"
                  passHref
                >
                  <Link>
                    <FlexContainer alignItems="center">
                      <Headline level={5}>
                        {pipelineSchedule?.name || id}
                      </Headline>
                      <Spacing ml={1} />
                      <ChevronRight default size={2 * UNIT} />
                    </FlexContainer>
                  </Link>
                </NextLink>
              </FlexContainer>
              <Spacing mt={1}>
                <BarStackChart
                  colors={BAR_STACK_COLORS}
                  // @ts-ignore
                  data={stats}
                  getXValue={(data) => data['date']}
                  height={200}
                  keys={BAR_STACK_STATUSES}
                  margin={{
                    bottom: 30,
                    left: 35,
                    right: 0,
                    top: 10,
                  }}
                  tooltipLeftOffset={TOOLTIP_LEFT_OFFSET}
                  xLabelFormat={label => moment(label).format('MMM DD')}
                />
              </Spacing>
            </Spacing>
          );
        })}
      </Spacing>
    </Monitor>
  );
}

PipelineRunsMonitor.getInitialProps = async (ctx: any) => {
  const {
    pipeline: pipelineUUID,
  }: {
    pipeline: string;
  } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PrivateRoute(PipelineRunsMonitor);
