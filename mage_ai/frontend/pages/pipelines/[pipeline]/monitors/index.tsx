import React, { useMemo } from 'react';
import NextLink from 'next/link';
import moment from 'moment';
import styled from 'styled-components';

import BarStackChart from '@components/charts/BarStack';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Monitor from '@components/Monitor';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import { ChevronRight } from '@oracle/icons';
import { MonitorTypeEnum } from '@components/Monitor/constants';
import { SCHEDULE_TYPE_TO_LABEL } from '@interfaces/PipelineScheduleType';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';

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

export const BAR_STACK_COLORS = [
  dark.accent.warning,
  dark.background.success,
  dark.accent.negative,
  dark.content.active,
  dark.interactive.linkPrimary,
];
export const BAR_STACK_STATUSES = ['cancelled', 'completed', 'failed', 'initial', 'running'];

function PipelineRunsMonitor({
  pipeline: pipelineProp,
}: PipelineRunsMonitorProps) {
  const pipelineUUID = pipelineProp.uuid;

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
  } = dataMonitor?.monitor_stats || {};

  const dateRange = useMemo(() => {
    let date = new Date()
    const dateRange = []
    for (let i = 0; i < 90; i++) {
      dateRange.unshift(date.toISOString().split('T')[0]);
      date.setDate(date.getDate() - 1);
    }
    return dateRange;
  }, []);

  const totalPipelineRunData = useMemo(() => {
    if (monitorStats) {
      const allPipelineRunData = Object.entries(monitorStats).reduce(
        // @ts-ignore
        (obj, [id, { data: scheduleStats }]) => {
          const updated = {};
          Object.entries(scheduleStats).forEach(([date, dateStats]) => {
            let currentStats = {};
            if (date in obj) {
              currentStats = obj[date];
            }
            const updatedStats = {};
            Object.entries(dateStats).forEach(([status, num]) => {
              const currentNum = currentStats?.[status] ? currentStats[status] : 0;
              updatedStats[status] = currentNum + num;
            });
            updated[date] = {
              ...currentStats,
              ...updatedStats,
            };
          });

          return {
            ...obj,
            ...updated,
          };
        },
        {},
      );
      return dateRange.map(date => ({
        date,
        ...(allPipelineRunData[date] || {}),
      }));
    } else {
      return [];
    }
  }, [
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
  }, [
    pipeline,
  ]);

  return (
    <Monitor
      breadcrumbs={breadcrumbs}
      monitorType={MonitorTypeEnum.PIPELINE_RUNS}
      pipeline={pipeline}
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
              top: 10,
              bottom: 30,
              left: 35,
              right: 0
            }}
            xLabelFormat={label => moment(label).format('MMM DD')}
          />
        </Spacing>
        {pipelineRunsData && Object.entries(pipelineRunsData).map(([id, stats]) => {
          const pipelineSchedule = pipelineSchedulesById?.[id];
          return (
            <Spacing mt={3}>
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
                    top: 10,
                    bottom: 30,
                    left: 35,
                    right: 0
                  }}
                  xLabelFormat={label => moment(label).format('MMM DD')}
                />
              </Spacing>
            </Spacing>
          );
        })}
      </Spacing>
    </Monitor>
  )
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

export default PipelineRunsMonitor;
