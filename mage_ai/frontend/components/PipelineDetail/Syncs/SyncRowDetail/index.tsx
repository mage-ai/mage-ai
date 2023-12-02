import Ansi from 'ansi-to-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PipelineRunType, { RunStatus, RUN_STATUS_TO_LABEL } from '@interfaces/PipelineRunType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import {
  BarStyle,
} from './index.style';
import {
  ArrowLeft,
  Check,
  Logs,
} from '@oracle/icons';
import { RunStatus as RunStatusBlockRun } from '@interfaces/BlockRunType';
import { UNIT } from '@oracle/styles/units/spacing';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import {
  getBlockRunsByStream,
  getRecordsData,
  getStreams,
  getTimesFromStream,
  pipelineRunEstimatedTimeRemaining,
  pipelineRunProgress,
  pipelineRunRuntime,
} from '@utils/models/pipelineRun';
import {
  numberWithCommas,
  pluralize,
  prettyUnitOfTime,
} from '@utils/string';
import { pauseEvent } from '@utils/events';
import { range, sortByKey, sum } from '@utils/array';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { utcStringToElapsedTime } from '@utils/date';

type SyncRowDetailProps = {
  onClickRow: (rowIndex: number) => void
  pipelineRun?: PipelineRunType;
  selectedStream?: string;
};

function SyncRowDetail({
  onClickRow,
  pipelineRun,
  selectedStream,
}: SyncRowDetailProps) {
  const router = useRouter();
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const [runtime, setRuntime] = useState<number>(null);
  const [runtimeStream, setRuntimeStream] = useState<number>(null);

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

  const etaForStream =
    useMemo(() => selectedStream ? etaByStream[selectedStream] : null, [etaByStream, selectedStream]);

  const progress: number = useMemo(() => {
    if (selectedStream && etaByStream) {
      const {
        completed,
        total,
      } = etaByStream[selectedStream] || {};
      if (total >= 1) {
        return completed / total;
      }
    } else if (pipelineRun) {
      return pipelineRunProgress(pipelineRun);
    }

    return 0;
  }, [etaByStream, pipelineRun, selectedStream]);

  const progressBar = useMemo(() => (
    <FlexContainer>
      {range(101).map((i, idx) => (
        <BarStyle
          even={idx % 2 === 0}
          fill={progress > 0 && Math.round(progress * 100) >= idx}
          key={idx}
        />
      ))}
    </FlexContainer>
  ), [progress]);

  const statusMessage = useMemo(() => {
    if (selectedStream) {
      const brs = blockRunsByStream[selectedStream] || [];
      const done = brs.every(({ status }) => RunStatusBlockRun.COMPLETED === status);
      const br = sortByKey(brs, ({ updated_at: ts }) => ts, { ascending: false })[0];
      const brStatus = br?.status;
      const {
        completed,
        runtime,
        total,
      } = etaForStream || {};

      if (done) {
        return `Sync complete for ${selectedStream}`;
      } else if ([RunStatusBlockRun.CANCELLED, RunStatusBlockRun.FAILED].includes(brStatus)) {
        return RUN_STATUS_TO_LABEL[brStatus];
      } else if (runtime && total >= 1) {
        const v = Math.ceil(runtime * (total - completed) / 60);
        return `${pluralize('minute', v, true)} to completion`;
      } else {
        return 'Estimating time remaining for stream...';
      }
    }

    if (RunStatus.COMPLETED === pipelineRun?.status) {
      return 'Sync complete';
    } else if (pipelineRun) {
      if ([RunStatus.CANCELLED, RunStatus.FAILED].includes(pipelineRun?.status)) {
        return RUN_STATUS_TO_LABEL[pipelineRun?.status];
      } else if (RunStatus.INITIAL === pipelineRun?.status) {
        return 'Initializing sync (this can take several minutes)';
      } else if (eta === null) {
        return 'Estimating time remaining...';
      } else {
        const v = Math.ceil(eta / 60);
        return `${pluralize('minute', v, true)} to completion`;
      }
    }

    return 'Select a sync';
  }, [
    blockRunsByStream,
    eta,
    etaForStream,
    pipelineRun,
    selectedStream,
  ]);

  const timesForStream = useMemo(() => pipelineRun && selectedStream
      ? getTimesFromStream(pipelineRun, selectedStream)
      : {
        completed: null,
        completedAt: null,
        done: null,
        progress: null,
        runtime: null,
        startedAt: null,
        status: null,
        timeText: null,
        total: null,
        updatedAt: null,
      },
    [
      pipelineRun,
      selectedStream,
    ],
  );

  useEffect(() => {
    let interval;

    if (pipelineRun) {
      const seconds = pipelineRunRuntime(pipelineRun);
      setRuntime(seconds);
      interval = setInterval(() => setRuntime(prev => prev + 1), 1000);
    }

    return () => clearInterval(interval);
  }, [pipelineRun]);

  useEffect(() => {
    let interval;

    if (pipelineRun && selectedStream && timesForStream) {
      const seconds = timesForStream?.runtime || 0;
      setRuntimeStream(seconds);
      interval = setInterval(() => setRuntimeStream(prev => prev + 1), 1000);
    }

    return () => clearInterval(interval);
  }, [pipelineRun, selectedStream, timesForStream]);

  const runtimeFinal = useMemo(() => {
    if (!pipelineRun) {
      return;
    }

    if (selectedStream) {
      return timesForStream?.timeText;
    }

    const seconds = pipelineRunRuntime(pipelineRun);

    return prettyUnitOfTime(seconds);
  }, [
    pipelineRun,
    selectedStream,
    timesForStream,
  ]);
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
  const runtimeStreamText = useMemo(() => {
    const hours = Math.floor((runtimeStream % (1 * 60 * 60 * 24)) / (1 * 60 * 60));
    const minutes = Math.floor((runtimeStream % (1 * 60 * 60)) / (1 * 60));
    const seconds = Math.floor((runtimeStream % (1 * 60)) / 1);

    return [
      hours >= 10 ? String(hours) : `0${hours}`,
      minutes >= 10 ? String(minutes) : `0${minutes}`,
      seconds >= 10 ? String(seconds) : `0${seconds}`,
    ].join(':');
  }, [runtimeStream]);

  const {
    errors,
    records,
    recordsInserted,
    recordsProcessed,
    recordsUpdated,
  } = useMemo(() => pipelineRun
      ? getRecordsData(pipelineRun)
      : {
        errors: null,
        records: null,
        recordsInserted: null,
        recordsProcessed: null,
        recordsUpdated: null,
      },
    [pipelineRun],
  );
  const recordsDataForStream = useMemo(() => pipelineRun && selectedStream
      ? getRecordsData(pipelineRun, selectedStream)
      : {
        errors: null,
        records: null,
        recordsInserted: null,
        recordsProcessed: null,
        recordsUpdated: null,
      },
    [pipelineRun, selectedStream],
  );

  const stats = useMemo(() => {
    const records1 = selectedStream ? recordsDataForStream?.records : records;
    const recordsInserted1 = selectedStream ? recordsDataForStream?.recordsInserted : recordsInserted;
    const recordsProcessed1 = selectedStream ? recordsDataForStream?.recordsProcessed : recordsProcessed;
    const recordsUpdated1 = selectedStream ? recordsDataForStream?.recordsUpdated : recordsUpdated;

    const arr = [
      {
        label: 'Rows fetched',
        value: records1 === null ? '-' : numberWithCommas(records1),
      },
    ];

    if (recordsInserted1 === null && recordsUpdated1 === null) {
      arr.push({
        label: 'Rows processed',
        value: recordsProcessed1 === null ? '-' : numberWithCommas(recordsProcessed1),
      });
    } else if (recordsInserted1 !== null) {
      arr.push({
        label: 'Rows inserted',
        value: numberWithCommas(recordsInserted1),
      });
    } else if (recordsUpdated1 !== null) {
      arr.push({
        label: 'Rows updated',
        value: numberWithCommas(recordsUpdated1),
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
    recordsDataForStream,
    recordsInserted,
    recordsProcessed,
    recordsUpdated,
    selectedStream,
  ]);

  const tableMemo = useMemo(() => {
    if (!pipelineRun) {
      return <div />;
    }
    const streams = getStreams(pipelineRun);

    return (
      <Table
        columnFlex={[null, null, null, null, null, null]}
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
        isSelectedRow={(rowIndex: number) => selectedStream && selectedStream === streams[rowIndex]}
        onClickRow={onClickRow}
        rows={streams.map((stream: string) => {
          const {
            completed,
            completedAt,
            done,
            progress: progressForStream,
            startedAt,
            status,
            timeText,
            total,
          } = getTimesFromStream(pipelineRun, stream);

          const hasError = !!errors[stream];

          return [
            <Text
              danger={hasError}
              default={!hasError}
              key="stream"
              monospace
            >
              {stream}
            </Text>,
            <Text
              default
              key="started_at"
              monospace
              title={startedAt ? utcStringToElapsedTime(startedAt) : null}
            >
              {startedAt
                ? displayLocalOrUtcTime(startedAt, displayLocalTimezone)
                : <>&#8212;</>
              }
            </Text>,
            <Text
              default
              key="completed_at"
              monospace
              title={completedAt ? utcStringToElapsedTime(completedAt) : null}
            >
              {completedAt
                ? displayLocalOrUtcTime(completedAt, displayLocalTimezone)
                : <>&#8212;</>
              }
            </Text>,
            <Text default key="runtime">
              {[RunStatusBlockRun.INITIAL, RunStatusBlockRun.RUNNING].includes(status) ? '-' : timeText}
            </Text>,
            <div key="progress">
              {done && <Check default size={2 * UNIT} />}
              {!done && (
                <FlexContainer>
                  {range(51).map((i, idx) => (
                    <BarStyle
                      even={idx % 2 === 0}
                      fill={progressForStream > 0 && Math.round(progressForStream * 50) >= idx}
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
              onClick={(e) => {
                router.push(
                  `/pipelines/${pipelineRun.pipeline_uuid}/logs?pipeline_run_id[]=${pipelineRun.id}`,
                );
                pauseEvent(e);
              }}
            >
              <Logs default size={2 * UNIT} />
            </Button>,
          ];
        })}
        uuid={`${pipelineRun?.id}-streams-table`}
      />
    );
  }, [
    displayLocalTimezone,
    errors,
    onClickRow,
    pipelineRun,
    router,
    selectedStream,
  ]);

  const bookmarksTableMemo = useMemo(() => {
    if (!pipelineRun || !selectedStream) {
      return;
    }

    const metrics = pipelineRun?.metrics || {
      blocks: null,
      destination: null,
      pipeline: null,
      source: null,
    };
    const sourceState =
      metrics?.pipeline?.[selectedStream]?.bookmarks?.[selectedStream];
    const destinationState =
      metrics?.blocks?.[selectedStream]?.destinations?.state?.bookmarks?.[selectedStream];

    if (!sourceState && !destinationState) {
      return;
    }

    const columns = Array.from(
      new Set(
        Object.keys(sourceState || {}).concat(Object.keys(destinationState || {})),
      ),
    ).sort();

    const rowData = [];
    columns.forEach((col: string) => {
      const arr = [
        <Text bold key={col} monospace muted small>
          {col}
        </Text>,
      ];

      [sourceState, destinationState].forEach((obj, idx) => {
        if (!obj) {
          return;
        }

        arr.push(
          <Text key={`${col}-${idx}`} monospace small>
            {obj[col]}
          </Text>,
        );
      });

      rowData.push(arr);
    });

    const columnData = [
      {
        label: () => '',
        uuid: 'column',
      },
    ];
    [
      [metrics?.source, 'source', sourceState],
      [metrics?.destination, 'destination', destinationState],
    ].forEach((tup) => {
      const [key, type, obj] = tup;
      if (!obj) {
        return;
      }

      // @ts-ignore
      columnData.push({
        uuid: `${key} (${type})`,
      });
    });

    return (
      <Table
        columnFlex={[null, 1, 1]}
        columns={columnData}
        rows={rowData}
        uuid={`${selectedStream}-bookmark-table`}
      />
    );
  }, [
    pipelineRun,
    selectedStream,
  ]);

  const recentRecordTableMemo = useMemo(() => {
    if (!pipelineRun || !selectedStream) {
      return;
    }

    const metrics = pipelineRun?.metrics || {
      blocks: null,
      destination: null,
      pipeline: null,
      source: null,
    };
    const sourceRecord = metrics?.blocks?.[selectedStream]?.sources?.record;
    const destinationRecord = metrics?.blocks?.[selectedStream]?.destinations?.record;

    if (!sourceRecord && !destinationRecord) {
      return;
    }

    const columns = Object.keys(destinationRecord || sourceRecord || {}).sort();

    const rowData = [];
    columns.forEach((col: string) => {
      const arr = [
        <Text bold key={col} monospace muted small>
          {col}
        </Text>,
      ];

      [sourceRecord, destinationRecord].forEach((obj, idx) => {
        if (!obj) {
          return;
        }

        const v = obj[col];
        const isJSONObject = typeof v === 'object';

        arr.push(
          <Text
            key={`${col}-${idx}`}
            monospace
            small
            textOverflow
            whiteSpaceNormal
            wordBreak
          >
            {isJSONObject && (
              <pre>
                {JSON.stringify(v, null, 2)}
              </pre>
            )}
            {!isJSONObject && v}
          </Text>,
        );
      });


      rowData.push(arr);
    });

    const columnData = [
      {
        label: () => '',
        uuid: 'column',
      },
    ];
    [
      [metrics?.source, 'source', sourceRecord],
      [metrics?.destination, 'destination', destinationRecord],
    ].forEach((tup) => {
      const [key, type, obj] = tup;
      if (!obj) {
        return;
      }

      // @ts-ignore
      columnData.push({
        uuid: `${key} (${type})`,
      });
    });

    return (
      <Table
        columnFlex={[null, 1, 1]}
        columns={columnData}
        rows={rowData.map((arr) => arr.map((val: string) => (
          <Text default key={val} monospace>
            {val}
          </Text>
        )))}
        uuid={`${selectedStream}-bookmark-table`}
      />
    );
  }, [
    pipelineRun,
    selectedStream,
  ]);

  const destinationTable: string = useMemo(() => {
    const obj = pipelineRun?.metrics?.blocks?.[selectedStream];
    return obj?.sources?.block_tags?.destination_table ||
      obj?.destinations?.block_tags?.destination_table;
  }, [
    pipelineRun,
    selectedStream,
  ]);

  return (
    <>
      <Spacing p={3}>
        {selectedStream && (
          <Spacing mb={3}>
            <FlexContainer alignItems="center">
              <Link
                block
                onClick={() => router.push(
                  `/pipelines/${pipelineRun.pipeline_uuid}/syncs?pipeline_run_id=${pipelineRun.id}`,
                )}
                preventDefault
              >
                <FlexContainer alignItems="center">
                  <ArrowLeft default size={1.5 * UNIT} />

                  <Spacing mr={1} />

                  <Text default>
                    Syncs
                  </Text>
                </FlexContainer>
              </Link>

              <Spacing mx={1}>
                <Text
                  default
                  monospace
                >
                  /
                </Text>
              </Spacing>

              <Text
                bold
                monospace
              >
                {selectedStream}
              </Text>
            </FlexContainer>
          </Spacing>
        )}

        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
        >
          <Spacing mr={2} my={1}>
            <Headline
              level={5}
              muted={!pipelineRun}
            >
              {statusMessage}
            </Headline>
          </Spacing>

          {pipelineRun && (
            <Button
              onClick={() => router.push(
                `/pipelines/${pipelineRun.pipeline_uuid}/logs?pipeline_run_id[]=${pipelineRun.id}`,
              )}
              small
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
            <Spacing mt={3}>
              <FlexContainer justifyContent="space-between">
                <div>
                  <Text bold large muted>
                    Runtime
                  </Text>
                  <Text headline>
                    {selectedStream && [RunStatusBlockRun.INITIAL, RunStatusBlockRun.RUNNING].includes(timesForStream?.status) && runtimeStreamText}
                    {selectedStream && ![RunStatusBlockRun.INITIAL, RunStatusBlockRun.RUNNING].includes(timesForStream?.status) && timesForStream?.timeText}
                    {!selectedStream && [RunStatus.INITIAL, RunStatus.RUNNING].includes(pipelineRun?.status) && runtimeText}
                    {!selectedStream && ![RunStatus.INITIAL, RunStatus.RUNNING].includes(pipelineRun?.status) && runtimeFinal}
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

                {Object.entries(errors).map(([stream, obj1], idx) => (!selectedStream || selectedStream === stream) && (
                  <Spacing key={stream} mt={idx >= 1 ? 1 : 0}>
                    {Object.entries(obj1).map(([conn, obj2]) => {
                      const {
                        error: errorLineOrig,
                        errors: errorStack,
                        message: errorTraceback,
                      }: {
                        error?: string;
                        errors?: string[];
                        message?: string;
                      } = obj2;

                      const errorLine = Array.isArray(errorLineOrig)
                        ? errorLineOrig.join(' ')
                        : errorLineOrig;

                      return (
                        <div key={`${stream}-${conn}`}>
                          <Spacing mb={errorTraceback || errorStack?.length >= 1 ? 2 : 0}>
                            <Text monospace preWrap textOverflow>
                              {stream}{!!conn && (
                                <Text inline monospace muted>&nbsp;({conn})</Text>
                              )}: <Text
                                default
                                inline
                                monospace
                              >
                                {errorLine && (
                                  <Ansi>
                                    {errorLine}
                                  </Ansi>
                                )}
                              </Text>
                            </Text>
                          </Spacing>

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

      {pipelineRun && !selectedStream && (
        <Spacing my={3}>
          {tableMemo}
        </Spacing>
      )}

      {pipelineRun && selectedStream && (
        <>
          {destinationTable && (
            <Spacing my={3}>
              <Spacing px={3}>
                <Headline level={5}>
                  Table name
                </Headline>

                <Spacing mt={1}>
                  <Text default monospace>
                    {destinationTable}
                  </Text>
                </Spacing>
              </Spacing>
            </Spacing>
          )}

          {bookmarksTableMemo && (
            <Spacing my={3}>
              <Spacing px={3}>
                <Headline level={5}>
                  Bookmarks
                </Headline>
              </Spacing>

              <Spacing px={1}>
                {bookmarksTableMemo}
              </Spacing>
            </Spacing>
          )}

          {recentRecordTableMemo && (
            <Spacing my={3}>
              <Spacing px={3}>
                <Headline level={5}>
                  Sample row
                </Headline>
              </Spacing>

              <Spacing px={1}>
                {recentRecordTableMemo}
              </Spacing>
            </Spacing>
          )}
        </>
      )}
    </>
  );
}

export default SyncRowDetail;
