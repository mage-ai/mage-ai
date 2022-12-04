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
  RowStyle,
  StatusStyle,
} from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  numberWithCommas,
  pluralize,
} from '@utils/string';

type SyncRowProps = {
  pipelineRun: PipelineRunType;
};

function SyncRow({
  pipelineRun,
}: SyncRowProps) {
  const {
    block_runs: blockRuns,
    created_at: createdAt,
    status,
  } = pipelineRun;
  const metrics = useMemo(() => pipelineRun?.metrics || {}, [pipelineRun]);
  const metricsBlocks = useMemo(() => metrics.blocks || {}, [metrics]);
  const metricsPipeline = useMemo(() => metrics.pipeline || {}, [metrics]);

  const destination: string = metrics.destination;
  const source: string = metrics.source;
  const numberOfStreams: number = useMemo(() => Object.keys(metricsPipeline).length, [metricsPipeline]);
  const {
    errors,
    records,
    recordsProcessed,
  }: number = useMemo(() => {
    let recordsInternal = 0;
    let recordsProcessedInternal = 0;
    const errors = {};

    Object.entries(metricsBlocks).forEach(([stream, obj]) => {
      const {
        destinations = {},
        sources = {},
      } = obj || {};

      if (sources?.records) {
        recordsInternal += Number(sources.records);
      }

      if (destinations?.records_updated) {
        recordsProcessedInternal += Number(destinations.records_updated);
      } else if (destinations?.records_inserted) {
        recordsProcessedInternal += Number(destinations.records_inserted);
      } else if (destinations?.records_affected) {
        recordsProcessedInternal += Number(destinations.records_affected);
      }

      ['destinations', 'sources'].forEach((key: string) => {
        const obj2 = obj[key] || {};

        if (obj2?.error) {
          if (!errors.stream) {
            errors[stream] = {}
          }

          errors[stream][key] = {
            error: obj2?.error,
            errors: obj2?.errors,
            message: obj2?.message,
          };
        }
      });
    });

    return {
      errors,
      records: recordsInternal,
      recordsProcessed: recordsProcessedInternal,
    };
  }, [metricsBlocks]);

  const progress = useMemo(() => {
    const total = blockRuns?.length || 1;
    const completed =
      blockRuns?.filter(({ status }) => RunStatusBlockRun.COMPLETED === status)?.length || 0;

    return completed / total;
  }, [blockRuns]);

  return (
    <RowStyle>
      <FlexContainer justifyContent="space-between">
        <Flex flex={1} flexDirection="column">
          <Headline bold level={5} monospace>
            {createdAt}
          </Headline>

          <Spacing fullWidth={false} mt={2}>
            <StatusStyle
              danger={RunStatus.FAILED === status}
              default={RunStatus.INITIAL === status}
              primary={RunStatus.RUNNING === status}
              success={RunStatus.COMPLETED === status}
              warning={RunStatus.CANCELLED === status}
            >
              <FlexContainer alignItems="center">
                {RunStatus.INITIAL !== status && (
                  <>
                    {RunStatus.COMPLETED === status && <Check size={2 * UNIT} />}
                    {RunStatus.RUNNING === status && <Spinner color={dark.monotone.white} small />}
                    &nbsp;
                  </>
                )}

                {RunStatus.RUNNING === status && (
                  <>
                    {Math.round(progress * 100)}%
                  </>
                )}
                {RunStatus.RUNNING !== status && RUN_STATUS_TO_LABEL[status]}
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
        </Flex>

        <Flex flex={1}>
          <Flex flex={1} flexDirection="column">
            <Spacing ml={3}>
              <Spacing mb={1}>
                <Text bold muted small>
                  Records processed
                </Text>
                <Text monospace>{numberWithCommas(recordsProcessed)}</Text>
              </Spacing>
              <Spacing mb={1}>
                <Text bold muted small>
                  Records remaining
                </Text>
                <Text monospace>
                  {records >= 1 ? numberWithCommas(records - recordsProcessed) : '-'}
                </Text>
              </Spacing>
            </Spacing>
          </Flex>

          <Flex flex={1} flexDirection="column">
            <Spacing ml={3}>
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
                <Text monospace>{numberWithCommas(numberOfStreams)}</Text>
              </Spacing>
            </Spacing>
          </Flex>
        </Flex>
      </FlexContainer>
    </RowStyle>
  );
}

export default SyncRow;
