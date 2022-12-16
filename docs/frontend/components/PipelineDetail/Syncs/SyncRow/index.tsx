import { useMemo } from 'react';

import BlockRunType, { RunStatus as RunStatusBlockRun } from '@interfaces/BlockRunType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PipelineRunType, {
  RUN_STATUS_TO_LABEL,
  RunStatus,
} from '@interfaces/PipelineRunType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { Check } from '@oracle/icons';
import {
  BarStyle,
  RowStyle,
  StatusStyle,
} from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  numberWithCommas,
  pluralize,
  prettyUnitOfTime,
} from '@utils/string';
import {
  getRecordsData,
  pipelineRunProgress,
  pipelineRunRuntime,
} from '@utils/models/pipelineRun';

type SyncRowProps = {
  onSelect: (id: number) => void;
  pipelineRun: PipelineRunType;
  selected: boolean;
};

function SyncRow({
  onSelect,
  pipelineRun,
  selected,
}: SyncRowProps) {
  const {
    block_runs: blockRuns,
    created_at: createdAt,
    status,
  } = pipelineRun;
  const metrics = useMemo(() => pipelineRun?.metrics || {
    blocks: {},
    destination: null,
    pipeline: {},
    source: null,
  }, [pipelineRun]);
  const metricsBlocks = useMemo(() => metrics.blocks || {}, [metrics]);
  const metricsPipeline = useMemo(() => metrics.pipeline || {}, [metrics]);

  const destination: string = metrics.destination;
  const source: string = metrics.source;
  const numberOfStreams: number = useMemo(() => Object.keys(metricsPipeline).length, [metricsPipeline]);
  const {
    errors,
    records,
    recordsProcessed,
  } = useMemo(() => getRecordsData(pipelineRun), [pipelineRun]);

  const progress = useMemo(() => pipelineRunProgress(pipelineRun), [pipelineRun]);

  const completed =
    useMemo(() => [RunStatus.COMPLETED].includes(status), [status]);
  const statusProps = useMemo(() => ({
    danger: RunStatus.FAILED === status,
    default: RunStatus.INITIAL === status,
    primary: RunStatus.RUNNING === status,
    success: completed,
    warning: RunStatus.CANCELLED === status,
  }), [completed, status]);

  const runtime = useMemo(() => {
    if (!pipelineRun) {
      return;
    }

    const seconds = pipelineRunRuntime(pipelineRun);

    return prettyUnitOfTime(seconds);
  }, [pipelineRun]);

  return (
    <RowStyle
      {...statusProps}
      onClick={() => onSelect(selected ? null : pipelineRun.id)}
      selected={selected}
    >
      <FlexContainer fullHeight justifyContent="space-between">
        <BarStyle {...statusProps} />

        <Flex flex={1} flexDirection="column">
          <Spacing ml={3} py={3}>
            <Headline bold level={5} monospace>
              {createdAt}
            </Headline>

            <Spacing fullWidth={false} mt={2}>
              <StatusStyle {...statusProps}>
                <FlexContainer alignItems="center">
                  {completed && <Check inverted size={2 * UNIT} />}
                  {[RunStatus.INITIAL, RunStatus.RUNNING].includes(status) && (
                    <Spinner
                      color={RunStatus.INITIAL !== status ? dark.monotone.white : null}
                      inverted={RunStatus.INITIAL === status}
                      small
                    />
                  )}
                  &nbsp;

                  {RunStatus.RUNNING === status && (
                    <>
                      &nbsp;
                      {Math.round(progress * 100)}%
                    </>
                  )}
                  {![RunStatus.INITIAL, RunStatus.RUNNING].includes(status) && RUN_STATUS_TO_LABEL[status]}
                  {RunStatus.INITIAL === status && 'Starting'}
                </FlexContainer>
              </StatusStyle>
            </Spacing>

            {Object.values(errors).length >= 1 && (
              <Spacing mt={1}>
                {Object.entries(errors).map(([stream, obj], idx) => (
                  <Text
                    key={stream}
                    monospace
                    muted
                    small
                  >
                    {stream} stream failed
                  </Text>
                ))}
              </Spacing>
            )}
          </Spacing>
        </Flex>

        <Flex flex={1}>
          <Flex flex={1} flexDirection="column">
            <Spacing ml={3} py={3}>
              <Spacing mb={1}>
                <Text bold muted small>
                  Rows processed
                </Text>
                <Text monospace>
                  {recordsProcessed >= 1 ? numberWithCommas(recordsProcessed) : '-'}
                </Text>
              </Spacing>
              <Spacing mb={1}>
                <Text bold muted small>
                  Rows remaining
                </Text>
                <Text monospace>
                  {records >= 1 && records >= recordsProcessed ? numberWithCommas(records - recordsProcessed) : '-'}
                </Text>
              </Spacing>
              {RunStatus.RUNNING !== status && (
                <Spacing mb={1}>
                  <Text bold muted small>
                    Runtime
                  </Text>
                  <Text monospace>
                    {runtime}
                  </Text>
                </Spacing>
              )}
            </Spacing>
          </Flex>

          <Flex flex={1} flexDirection="column">
            <Spacing ml={3} py={3}>
              <Spacing mb={1}>
                <Text bold muted small>
                  Source
                </Text>
                <Text monospace>{source || '-'}</Text>
              </Spacing>
              <Spacing mb={1}>
                <Text bold muted small>
                  Destination
                </Text>
                <Text monospace>{destination || '-'}</Text>
              </Spacing>
              <Spacing mb={1}>
                <Text bold muted small>
                  Streams
                </Text>
                <Text monospace>
                  {numberOfStreams >= 1 ? numberWithCommas(numberOfStreams) : '-'}
                </Text>
              </Spacing>
            </Spacing>
          </Flex>
        </Flex>
      </FlexContainer>
    </RowStyle>
  );
}

export default SyncRow;
