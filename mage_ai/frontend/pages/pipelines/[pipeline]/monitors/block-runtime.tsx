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
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { ICON_SIZE } from '@components/FileBrowser/index.style';
import { MonitorTypeEnum } from '@components/Monitor/constants';
import { ThemeContext } from 'styled-components';
import { capitalize, removeUnderscore } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getDateRange } from '@utils/date';
import { indexBy } from '@utils/array';

const ALL_BLOCKS_KEY = 'all_blocks';

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
    api.monitor_stats.detail('block_run_time', monitorStatQuery);

  useEffect(() => {
    fetchStats(pipelineSchedule);
  }, [fetchStats, pipelineSchedule]);

  const {
    stats: monitorStats,
  } = dataMonitor?.monitor_stat || {};

  const dateRange = useMemo(() => getDateRange(), []);

  const blockRuntimeData = useMemo(() => {
    let allBlockRuntimeData;
    let runtimeDataByBlockUUID;

    if (monitorStats) {
      allBlockRuntimeData = { [ALL_BLOCKS_KEY]: [] };
      runtimeDataByBlockUUID = {};

      Object.entries(monitorStats).forEach(
        // @ts-ignore
        ([blockUuid, { data: runtimeStats }]) => {
          runtimeDataByBlockUUID[blockUuid] = [];
          dateRange.forEach((date, idx) => {
            runtimeDataByBlockUUID[blockUuid].push({
              x: date,
              y: date in runtimeStats ? [runtimeStats[date]] : null,
            });

            if (!allBlockRuntimeData.all_blocks[idx]) {
              allBlockRuntimeData.all_blocks[idx] = { x: date, y: null };
            }
            if (date in runtimeStats) {
              if (!allBlockRuntimeData.all_blocks[idx].y) {
                allBlockRuntimeData.all_blocks[idx].y = [];
              }
              allBlockRuntimeData.all_blocks[idx].y.push({
                blockUUID: blockUuid,
                runtime: runtimeStats[date],
              });
            }
          });
        },
      );
    }

    return {
      ...allBlockRuntimeData,
      ...runtimeDataByBlockUUID,
    };
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
        {blockRuntimeData?.[ALL_BLOCKS_KEY]?.length > 0 &&
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
                  {blockUuid === ALL_BLOCKS_KEY
                    ? removeUnderscore(capitalize(blockUuid))
                    : blockUuid
                  }
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
                  getY={blockUuid === ALL_BLOCKS_KEY
                    ? (data, idx) => data?.y?.[idx]?.runtime
                    : null
                  }
                  getYScaleValues={blockUuid === ALL_BLOCKS_KEY
                    ? y => y?.map(yItem => yItem?.runtime) || []
                    : null}
                  gridProps={{
                    stroke: 'black',
                    strokeDasharray: null,
                    strokeOpacity: 0.2,
                  }}
                  height={blockUuid === ALL_BLOCKS_KEY ? 800 : 200}
                  hideGridX
                  margin={{
                    bottom: 30,
                    left: 35,
                    right: -1,
                    top: 10,
                  }}
                  noCurve
                  renderXTooltipContent={(data: {
                    x: string | number;
                    y: string | number | (string | number)[];
                  }) => (
                    <Text center inverted small>
                      {moment(data.x).format('MMM DD')}
                    </Text>
                  )}
                  renderYTooltipContent={(data: {
                    x: string | number;
                    y: string | number | (string | number)[];
                  }, idx) => {
                    const yValue = data?.y?.[idx];
                    if (blockUuid === ALL_BLOCKS_KEY) {
                      const individualBlockUUID = yValue?.blockUUID;
                      const yRuntime = yValue?.runtime;
                      return yRuntime !== undefined && (
                        <Text center inverted small>
                          {individualBlockUUID || ''}: {yRuntime.toFixed ? yRuntime.toFixed(3) : yRuntime}s
                        </Text>
                      );
                    }

                    return yValue !== undefined && (
                      <Text center inverted small>
                        {yValue.toFixed ? yValue.toFixed(3) : yValue}s
                      </Text>
                      );
                  }}
                  thickStroke
                  xLabelFormat={val => moment(val).format('MMM DD')}
                  xLabelRotate={false}
                  yLabelFormat={val => val % 1 === 0 ? val : val.toFixed(1)}
                />
              </div>
            </Spacing>
          ))
        }
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
