import moment from 'moment';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import {
  BarStyle,
} from './index.style';
import { Check, TodoList } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  numberWithCommas,
  pluralize,
  prettyUnitOfTime,
} from '@utils/string';
import {
  getBlockRunsByStream,
  getRecordsData,
  pipelineRunEstimatedTimeRemaining,
  pipelineRunProgress,
  pipelineRunRuntime,
} from '@utils/models/pipelineRun';
import { range, sortByKey, sum } from '@utils/array';

type SyncRowDetailProps = {
  pipelineRun?: PipelineRunType;
};

function SyncRowDetail({
  pipelineRun,
}: SyncRowDetailProps) {
  const router = useRouter();

  const [runtime, setRuntime] = useState<number>(null);

  const progress: number = useMemo(() => pipelineRun ? pipelineRunProgress(pipelineRun) : 0, [pipelineRun]);
  const progressBar = useMemo(() => (
    <FlexContainer>
      {range(101).map((i, idx) => (
        <BarStyle
          fill={progress > 0 && Math.round(progress * 100) >= idx}
          even={idx % 2 === 0}
          key={idx}
        />
      ))}
    </FlexContainer>
  ), [progress]);

  const blockRunsByStream =
    useMemo(() => pipelineRun ? getBlockRunsByStream(pipelineRun) : {}, [pipelineRun]);
  const etaByStream =
    useMemo(() => pipelineRun ? pipelineRunEstimatedTimeRemaining(pipelineRun) : {}, [
      pipelineRun,
    ]);
  const eta = useMemo(() => {
    let timeLeft = 0;
    const runtimes = [];
    const streamsWithNoEstimate = [];

    Object.entries(etaByStream).forEach(([stream, obj]) => {
      const {
        completed,
        runtime,
        total,
      } = obj;
      if (runtime === null) {
        streamsWithNoEstimate.push(obj);
      } else {
        runtimes.push(runtime);
        timeLeft += runtime * (total - completed);
      }
    });

    if (runtimes.length === 0) {
      return null;
    }

    const runtimeAverage = sum(runtimes) / runtimes.length;
    streamsWithNoEstimate.forEach(({
      completed,
      total,
    }) => {
      timeLeft += runtimeAverage * (total - completed);
    });

    return timeLeft;
  }, [etaByStream]);

  const statusMessage = useMemo(() => {
    if (RunStatus.COMPLETED === pipelineRun?.status) {
      return 'Sync complete';
    } else if (pipelineRun) {
      if (eta === null) {
        return 'Estimating time remaining...';
      } else {
        const v = Math.ceil(eta / 60)
        return `${pluralize('minute', v, true)} to completion`;
      }
    }

    return 'Select a sync';
  }, [
    eta,
    pipelineRun,
  ]);

  useEffect(() => {
    let interval;

    if (pipelineRun) {
      const seconds = pipelineRunRuntime(pipelineRun);
      setRuntime(seconds);
      interval = setInterval(() => setRuntime(prev => prev + 1), 1000);
    }

    return () => clearInterval(interval);
  }, [pipelineRun]);

  const runtimeFinal = useMemo(() => {
    if (!pipelineRun) {
      return;
    }

    const seconds = pipelineRunRuntime(pipelineRun);

    return prettyUnitOfTime(seconds);
  }, [pipelineRun]);
  const runtimeText = useMemo(() => {
    const hours = Math.floor((runtime % (1 * 60 * 60 * 24)) / (1 * 60 * 60));
    const minutes = Math.floor((runtime % (1 * 60 * 60)) / (1 * 60));
    const seconds = Math.floor((runtime % (1 * 60)) / 1);

    return [
      hours >= 10 ? String(hours) : `0${hours}`,
      minutes >= 10 ? String(minutes) : `0${minutes}`,
      seconds >= 10 ? String(seconds) : `0${seconds}`,
    ].join(':');
  }, [runtime]);

  const {
    errors,
    records,
    recordsInserted,
    recordsProcessed,
    recordsUpdated,
  }: number = useMemo(() => getRecordsData(pipelineRun), [pipelineRun]);

  const stats = useMemo(() => {
    const arr = [
      {
        label: 'Records loaded',
        value: records === null ? '-' : numberWithCommas(records),
      },
    ];

    if (recordsInserted === null && recordsUpdated === null) {
      arr.push({
        label: 'Records processed',
        value: recordsProcessed === null ? '-' : numberWithCommas(recordsProcessed),
      });
    } else if (recordsInserted !== null) {
      arr.push({
        label: 'Records inserted',
        value: numberWithCommas(recordsInserted),
      });
    } else if (recordsUpdated !== null) {
      arr.push({
        label: 'Records updated',
        value: numberWithCommas(recordsUpdated),
      });
    }

    return arr.map(({
      label,
      value,
    }) => (
      <div key={label}>
        <Text bold large muted>
          {label}
        </Text>
        <Text headline>
          {value}
        </Text>
      </div>
    ));
  }, [
    records,
    recordsInserted,
    recordsProcessed,
    recordsUpdated,
    runtimeFinal,
    runtimeText,
    status,
  ]);

  const tableMemo = useMemo(() => {
    if (!pipelineRun) {
      return <div />;
    }

    const metrics = pipelineRun?.metrics || {};
    const metricsBlocks = metrics.blocks || {};
    const metricsPipeline = metrics.pipeline || {};
    const streams = Object.keys(metricsBlocks).sort();

    return (
      <Table
        columnFlex={[]}
        columns={[
          {
            uuid: 'Stream',
          },
          {
            uuid: 'Start',
          },
          {
            uuid: 'End',
          },
          {
            uuid: 'Time',
          },
          {
            uuid: 'Progress',
          },
          {
            uuid: 'Logs',
          },
        ]}
        rows={streams.map((stream: string) => {
          const metricsBlock1 = metricsBlocks[stream] || {};
          const metricsBlock2 = metricsPipeline[stream] || {};
          const etaForStream = etaByStream[stream];
          const {
            completed,
            total,
          } = etaForStream;
          const progressForStream = completed / total;
          const done = progressForStream >= 1;

          const brs = blockRunsByStream[stream] || [];
          const startedAt =
            sortByKey(brs, ({ started_at: ts }) => ts, { ascending: true})[0]?.started_at;

          let completedAt;
          let timeText;
          if (done) {
            completedAt =
              sortByKey(brs, ({ completed_at: ts }) => ts, { ascending: false})[0]?.completed_at;

            if (completedAt) {
              const a = moment.utc(completedAt);
              const b = moment.utc(startedAt);

              timeText = prettyUnitOfTime(a.diff(b, 'second'));
            }
          }

          return [
            <Text default key="stream" monospace>
              {stream}
            </Text>,
            <Text default key="started_at" monospace>
              {startedAt ? startedAt.split('.')[0] : '-'}
            </Text>,
            <Text default key="completed_at" monospace>
              {completedAt ? completedAt.split('.')[0] : '-'}
            </Text>,
            <Text default key="runtime">
              {timeText}
            </Text>,
            <div key="progress">
              {done && <Check default size={2 * UNIT} />}
              {!done && (
                <FlexContainer>
                  {range(51).map((i, idx) => (
                    <BarStyle
                      fill={progressForStream > 0 && Math.round(progressForStream * 50) >= idx}
                      even={idx % 2 === 0}
                      key={idx}
                      small
                    />
                  ))}
                </FlexContainer>
              )}
            </div>,
            <Button
              default
              iconOnly
              key="logs"
              noBackground
              onClick={() => router.push(
                `/pipelines/${pipelineRun.pipeline_uuid}/logs?pipeline_run_id[]=${pipelineRun.id}`,
              )}
            >
              <TodoList default size={2 * UNIT} />
            </Button>,
          ];
        })}
        uuid={`{pipelineRun?.id}-streams-table`}
      />
    );
  }, [
    etaByStream,
    pipelineRun,
  ]);

  return (
    <>
      <Spacing p={3}>
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
        >
          <Spacing my={1} mr={2}>
            <Headline
              level={5}
              muted={!pipelineRun}
            >
              {statusMessage}
            </Headline>
          </Spacing>

          {pipelineRun && (
            <Button
              small
              onClick={() => router.push(
                `/pipelines/${pipelineRun.pipeline_uuid}/logs?pipeline_run_id[]=${pipelineRun.id}`,
              )}
            >
              Logs
            </Button>
          )}
        </FlexContainer>

        <Spacing mt={2}>
          {progressBar}
        </Spacing>

        {pipelineRun && (
          <>
            <Spacing mt={2}>
              <FlexContainer justifyContent="space-between">
                <div>
                  <Text bold large muted>
                    Runtime
                  </Text>
                  <Text headline>
                    {RunStatus.RUNNING === status && runtimeText}
                    {RunStatus.RUNNING !== status && runtimeFinal}
                  </Text>
                </div>

                {stats}
              </FlexContainer>
            </Spacing>

            {Object.values(errors).length >= 1 && (
              <Spacing mt={3}>
                <Headline level={5} muted>
                  Errors
                </Headline>

                {Object.entries(errors).map(([stream, obj1], idx) => (
                  <Spacing key={stream} mt={idx >= 1 ? 1 : 0}>
                    {Object.entries(obj1).map(([conn, obj2]) => {
                      const {
                        error: errorLine,
                        errors: errorStack,
                        message: errorTraceback,
                      } = obj2;

                      return (
                        <div key={`${stream}-${conn}`}>
                          <Text monospace>
                            {stream} <Text inline monospace muted>({conn})</Text>: <Text
                              default
                              inline
                              monospace
                            >
                              {errorLine}
                            </Text>
                          </Text>

                          <Text
                            default
                            monospace
                            preWrap
                            small
                          >
                            {errorTraceback}
                          </Text>

                          {errorStack.map(l => (
                            <Text
                              default
                              key={l}
                              monospace
                              preWrap
                              small
                            >
                              {l}
                            </Text>
                          ))}
                        </div>
                      );
                    })}
                  </Spacing>
                ))}
              </Spacing>
            )}
          </>
        )}
      </Spacing>

      {pipelineRun && (
        <Spacing my={3}>
          {tableMemo}
        </Spacing>
      )}
    </>
  );
}

export default SyncRowDetail;
