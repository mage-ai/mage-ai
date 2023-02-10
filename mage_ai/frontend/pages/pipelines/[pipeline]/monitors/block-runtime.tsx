import React, { useContext, useEffect, useMemo, useState } from 'react';
import moment from 'moment';

import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import LineSeries from '@components/charts/LineSeries';
import Monitor from '@components/Monitor';
import PipelineType from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Select from '@oracle/elements/Inputs/Select';
import Text from '@oracle/elements/Text';
import api, { MONITOR_STATS } from '@api';
import buildUrl from '@api/utils/url';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { ICON_SIZE } from '@components/FileBrowser/index.style';
import { MonitorTypeEnum } from '@components/Monitor/constants';
import { ThemeContext } from 'styled-components';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { useMutation } from 'react-query';

type BlockRuntimeMonitorProps = {
  pipeline: PipelineType;
};

function BlockRuntimeMonitor({
  pipeline: pipelineProp,
}: BlockRuntimeMonitorProps) {
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

  const [dataMonitor, setDataMonitor] = useState<any>(null);
  const [fetchStats] = useMutation(
    async (id: number) => {
      let url = `${buildUrl(MONITOR_STATS)}/block_run_time?pipeline_uuid=${pipelineUUID}`;
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
    fetchStats(pipelineSchedule);
  }, [fetchStats]);

  const {
    stats: monitorStats,
  } = dataMonitor?.monitor_stats || {};

  const dateRange = useMemo(() => {
    const date = new Date();
    const dateRange = [];
    for (let i = 0; i < 90; i++) {
      dateRange.unshift(date.toISOString().split('T')[0]);
      date.setDate(date.getDate() - 1);
    }
    return dateRange;
  }, []);

  const blockRuntimeData = useMemo(() => {
    if (monitorStats) {
      return Object.entries(monitorStats).reduce(
        // @ts-ignore
        (obj, [blockUuid, { data: runtimeStats }]) => {
          return {
            ...obj,
            [blockUuid]: dateRange.map(date => ({
              x: date,
              y: date in runtimeStats ? [runtimeStats[date]] : null,
            }))
          };
        },
        {},
      );
    }
  }, [
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
      monitorType={MonitorTypeEnum.BLOCK_RUNTIME}
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
              <option
                key={schedule.id}
                value={schedule.id}
              >
                {schedule.name}
              </option>
            ))}
          </Select>
        </FlexContainer>
      }
    >
      <Spacing mx={2}>
        {blockRuntimeData &&
          Object.entries(blockRuntimeData).map(([blockUuid, data], idx) => (
            <Spacing
              key={`${blockUuid}_${idx}`}
              mt={2}
            >
              <FlexContainer alignItems="center">
                <Spacing mx={1}>
                  <Circle
                    color={getColorsForBlockType(
                      blocksByUUID[blockUuid]?.type,
                      { blockColor: blocksByUUID[blockUuid]?.color, theme },
                    ).accent}
                    size={ICON_SIZE}
                    square
                  />
                </Spacing>
                <Headline level={4}>
                  {blockUuid}
                </Headline>
              </FlexContainer>
              <div
                style={{
                  backgroundColor: dark.background.chartBlock,
                  borderRadius: `${BORDER_RADIUS_LARGE}px`,
                  marginTop: '8px',
                }}
              >
                <LineSeries
                  // @ts-ignore
                  data={data}
                  getX={data => moment(data.x).valueOf()}
                  gridProps={{
                    stroke: 'black',
                    strokeDasharray: null,
                    strokeOpacity: 0.2,
                  }}
                  height={200}
                  hideGridX
                  margin={{
                    top: 10,
                    bottom: 30,
                    left: 35,
                    right: -1,
                  }}
                  noCurve
                  renderXTooltipContent={data => (
                    <Text center inverted small>
                      {moment(data.x).format('MMM DD')}
                    </Text>
                  )}
                  renderYTooltipContent={data => {
                    const yValue = data?.y?.[0];
                    return yValue !== undefined && (
                      <Text center inverted small>
                        {yValue.toFixed ? yValue.toFixed(3) : yValue}s
                      </Text>
                      );
                  }}
                  thickStroke
                  xLabelFormat={val => moment(val).format('MMM DD')}
                  xLabelRotate={false}
                />
              </div>
            </Spacing>
          )
        )}
      </Spacing>
    </Monitor>
  );
}

BlockRuntimeMonitor.getInitialProps = async (ctx: any) => {
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

export default PrivateRoute(BlockRuntimeMonitor);
