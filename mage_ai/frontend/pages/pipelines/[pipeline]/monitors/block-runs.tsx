import React, { useContext, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { ThemeContext } from 'styled-components';

import BarStackChart from '@components/charts/BarStack';
import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Monitor from '@components/Monitor';
import PipelineType from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import api, { MONITOR_STATS } from '@api';
import buildUrl from '@api/utils/url';
import dark from '@oracle/styles/themes/dark';
import { BAR_STACK_COLORS, BAR_STACK_STATUSES } from '.';
import { ICON_SIZE } from '@components/FileBrowser/index.style';
import { MonitorTypeEnum } from '@components/Monitor/constants';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { useMutation } from 'react-query';

type BlockRunsMonitorProps = {
  pipeline: PipelineType;
}

function BlockRunsMonitor({
  pipeline: pipelineProp,
}: BlockRunsMonitorProps) {
  const theme = useContext(ThemeContext);
  const [pipelineSchedule, setPipelineSchedule] = useState<number>(null);

  const pipelineUUID = pipelineProp.uuid;

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

  const { data: dataPipelineSchedules } = api.pipeline_schedules.pipelines.list(pipelineUUID);
  const pipelineSchedules = useMemo(
    () => dataPipelineSchedules?.pipeline_schedules,
    [dataPipelineSchedules],
  );

  const blocksByUUID = useMemo(() => indexBy(pipeline?.blocks, ({ uuid }) => uuid) || {}, [pipeline]);

  const [dataMonitor, setDataMonitor] = useState<any>(null);
  const [fetchStats] = useMutation(
    async (id) => {
      let url = `${buildUrl(MONITOR_STATS)}/block_run_count?pipeline_uuid=${pipelineUUID}`;
      if (id || id === 0) {
        url += `&pipeline_schedule_id=${id}`;
      }
      return fetch(url, { method: 'GET' });
    },
    {
      onSuccess: (response: any) => onSuccess(
        response,
        {
          callback: (res) => {
            setDataMonitor(res);
          },
        },
      ),
    }
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
  }, [monitorStats]);

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
                fetchStats(val);
                setPipelineSchedule(val);
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
              <option value={schedule.id}>
                {schedule.name}
              </option>
            ))}
          </Select>
        </FlexContainer>
      }
    >
      <Spacing mx={2}>
        {blockRunData && Object.entries(blockRunData).map(([blockUuid, blockData]) => {
          return (
            <Spacing mt={3}>
              <FlexContainer alignItems="center">
                <Spacing mx={1}>
                  <Circle
                    color={getColorsForBlockType(blocksByUUID[blockUuid]?.type, { theme }).accent}
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

export default BlockRunsMonitor;
