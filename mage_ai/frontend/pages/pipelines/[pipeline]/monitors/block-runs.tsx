import React, { useContext, useMemo, useState } from 'react';
import moment from 'moment';
import { ThemeContext } from 'styled-components';

import BarStackChart from '@components/charts/BarStack';
import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Monitor from '@components/Monitor';
import PipelineType from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import dark from '@oracle/styles/themes/dark';

import {
  BAR_STACK_COLORS,
  BAR_STACK_STATUSES,
  MonitorTypeEnum,
  TOOLTIP_LEFT_OFFSET,
} from '@components/Monitor/constants';
import { ICON_SIZE } from '@components/FileBrowser/index.style';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getDateRange } from '@utils/date';
import { indexBy } from '@utils/array';

type BlockRunsMonitorProps = {
  pipeline: PipelineType;
};

function BlockRunsMonitor({
  pipeline: pipelineProp,
}: BlockRunsMonitorProps) {
  const theme = useContext(ThemeContext);
  const [pipelineSchedule, setPipelineSchedule] = useState<number>(null);

  const pipelineUUID = pipelineProp.uuid;

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

  const { data: dataPipelineSchedules } = api.pipeline_schedules.pipelines.list(pipelineUUID);
  const pipelineSchedules = useMemo(
    () => dataPipelineSchedules?.pipeline_schedules,
    [dataPipelineSchedules],
  );

  const blocksByUUID = useMemo(() => indexBy(pipeline?.blocks, ({ uuid }) => uuid) || {}, [pipeline]);

  const monitorStatQuery: {
    pipeline_uuid: string;
    pipeline_schedule_id?: number;
  } = {
    pipeline_uuid: pipelineUUID,
  };
  if (pipelineSchedule || pipelineSchedule === 0) {
    monitorStatQuery.pipeline_schedule_id = Number(pipelineSchedule);
  }
  const { data: dataMonitor, mutate: fetchStats } =
    api.monitor_stats.detail('block_run_count', monitorStatQuery);

  const {
    stats: monitorStats,
  } = dataMonitor?.monitor_stat || {};

  const dateRange = useMemo(() => getDateRange(), []);

  const blockRunData = useMemo(() => {
    if (monitorStats) {
      return Object.entries(monitorStats).reduce(
        // @ts-ignore
        (obj, [blockUuid, { data: blockRunStats }]) => {
          const updated = dateRange.map(date => ({
            date,
            ...(blockRunStats[date] || {}),
          }));
          return {
            ...obj,
            [blockUuid]: updated,
          };
        },
        {},
      );
    }
  }, [dateRange, monitorStats]);

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
      monitorType={MonitorTypeEnum.BLOCK_RUNS}
      pipeline={pipeline}
      subheader={
        <FlexContainer>
          <Select
            backgroundColor={dark.interactive.defaultBackground}
            label="Trigger:"
            onChange={e => {
              const val = e.target.value;
              if (val !== 'initial') {
                setPipelineSchedule(val);
                fetchStats(val);
              } else {
                fetchStats();
                setPipelineSchedule(null);
              }
            }}
            value={pipelineSchedule || 'initial'}
          >
            <option value="initial">
              All
            </option>
            {pipelineSchedules && pipelineSchedules.map(schedule => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.name}
              </option>
            ))}
          </Select>
        </FlexContainer>
      }
    >
      <Spacing mx={2}>
        {blockRunData && Object.entries(blockRunData).map(([blockUuid, blockData]) => (
          <Spacing key={blockUuid} mt={3}>
            <FlexContainer alignItems="center">
              <Spacing mx={1}>
                <Circle
                  color={getColorsForBlockType(
                    blocksByUUID[blockUuid]?.type, {
                      blockColor: blocksByUUID[blockUuid]?.color,
                      theme,
                    },
                  ).accent}
                  size={ICON_SIZE}
                  square
                />
              </Spacing>
              <Headline level={4}>
                {blockUuid}
              </Headline>
            </FlexContainer>
            <Spacing mt={1}>
              <BarStackChart
                colors={BAR_STACK_COLORS}
                // @ts-ignore
                data={blockData}
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
        ))}
      </Spacing>
    </Monitor>
  );
}

BlockRunsMonitor.getInitialProps = async (ctx: any) => {
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

export default PrivateRoute(BlockRunsMonitor);
