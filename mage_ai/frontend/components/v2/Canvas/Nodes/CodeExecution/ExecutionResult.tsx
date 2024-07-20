import EventStreamType, {
  ResultType,
  ExecutionResultType,
  ExecutionStatusEnum,
} from '@interfaces/EventStreamType';
import Scrollbar from '@mana/elements/Scrollbar';
import ExecutionOutput from '../../../ExecutionOutput';
import Ansi from 'ansi-to-react';
import Grid from '@mana/components/Grid';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Text from '@mana/elements/Text';
import Link from '@mana/elements/Link';
import moment from 'moment';
import styles from '@styles/scss/components/Canvas/Nodes/ExecutionOutput.module.scss';
import { DATE_FORMAT_LONG_MS } from '@utils/date';
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/v2/Tooltip';
import { convertToMillisecondsTimestamp, dateFormatLongFromUnixTimestamp } from '@utils/date';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import { formatDurationFromEpoch, isNumeric } from '@utils/string';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { ExecutionOutputType } from '@interfaces/CodeExecutionType';
import Loading from '@mana/components/Loading';

export type ExecutionResultProps = {
  containerRect?: DOMRect;
  executionOutput?: ExecutionOutputType;
  first?: boolean;
  last?: boolean;
  handleContextMenu?: (
    event: React.MouseEvent<HTMLDivElement>,
    messageRequestUUID: string,
    results: ExecutionResultType[],
    executionOutput?: ExecutionOutputType,
  ) => void;
  messageRequestUUID: string;
  fetchOutput?: (
    messageRequestUUID: string,
    opts: {
      onError: () => void;
      onSuccess: (executionOutput: ExecutionOutputType) => void;
      query: {
        namespace: string;
        path: string;
      };
    },
  ) => void;
  results: ExecutionResultType[];
};

function ExecutionResult(
  {
    containerRect,
    executionOutput: executionOutputProp,
    fetchOutput,
    first,
    last,
    handleContextMenu,
    messageRequestUUID,
    results,
  }: ExecutionResultProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const resultsErrors = useMemo(
    () => results?.filter(result => ExecutionStatusEnum.ERROR === result.status),
    [results],
  );
  const success = useMemo(
    () => results?.find(result => ExecutionStatusEnum.SUCCESS === result.status),
    [results],
  );
  const hasOutput = useMemo(
    () => results?.find(result => ResultType.OUTPUT === result.type),
    [results],
  );

  const [executionOutput, setExecutionOutput] = useState<ExecutionOutputType>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const { id, namespace, path } = useMemo(
    () => ({
      id: success?.process?.message_request_uuid,
      ...success?.metadata,
    }),
    [success],

  );

  const getOutput = useCallback(() => {
    setLoading(true);

    fetchOutput(id, {
      onError: () => {
        setLoading(false);
      },
      onSuccess: (eoutput) => {
        setLoading(false);
        setExecutionOutput(eoutput);
      },
      query: {
        namespace: encodeURIComponent(namespace),
        path: encodeURIComponent(path),
      },
    });
  }, [fetchOutput, id, namespace, path]);

  const timestamps = useMemo(
    () =>
      results?.reduce(
        (acc, result) => ({
          max: acc.max === null ? result.timestamp : Math.max(acc.max, result.timestamp),
          min: acc.min === null ? result.timestamp : Math.min(acc.min, result.timestamp),
        }),
        {
          max: null,
          min: null,
        },
      ),
    [results],
  );

  const status = useMemo(() => {
    if (resultsErrors?.length > 0) {
      return ExecutionStatusEnum.ERROR;
    }

    if (success) {
      return ExecutionStatusEnum.SUCCESS;
    }

    return results?.find(r => ResultType.STATUS === r.type)?.status;
  }, [results, resultsErrors, success]);

  const resultsInformation = useMemo(
    () =>
      results?.reduce(
        (
          acc: React.ReactNode[],
          result: ExecutionResultType,
        ) => {
          const {
            // data_type,
            error,
            // output,
            output_text: outputText,
            process: resultProcess,
            result_id: resultID,
            status: resultStatus,
            timestamp,
            type: resultType,
            // uuid: resultUuid,
          } = result;

          if (ResultType.STATUS === resultType) {
            return acc;
          }

          const {
            // exitcode,
            // is_alive,
            // message,
            message_request_uuid: groupUUID,
            // message_uuid,
            // pid,
            // timestamp: processTimestamp,
            // uuid: processUuid,
          } = resultProcess;

          if (ResultType.OUTPUT === resultType) {
            if (executionOutput) {
              return acc;
            } else if (ExecutionStatusEnum.ERROR !== status) {
              return acc.concat(
                <Grid alignItems="center"
                  columnGap={8}
                  data-message-request-uuid={groupUUID}
                  key={resultID}
                  templateColumns="1fr"
                  templateRows="auto"
                >
                  <Link onClick={() => getOutput()} xsmall>
                    Load output
                  </Link>
                </Grid>,
              );
            }
          }

          const isFinalOutput =
            ResultType.DATA === resultType && ExecutionStatusEnum.SUCCESS === resultStatus;

          return acc.concat(
            <TooltipWrapper
              align={TooltipAlign.END}
              horizontalDirection={TooltipDirection.RIGHT}
              justify={TooltipJustify.CENTER}
              key={resultID}
              tooltip={
                <Grid
                  columnGap={8}
                  data-message-request-uuid={groupUUID}
                  templateColumns="auto 1fr"
                >
                  <Text
                    monospace
                    muted
                    small
                    style={{
                      pointerEvents: 'none',
                    }}
                  >
                    [{isFinalOutput ? 'output' : acc?.length ?? 0}]
                  </Text>
                  <Text monospace secondary small>
                    {displayLocalOrUtcTime(
                      moment(timestamp).format(DATE_FORMAT_LONG_MS),
                      displayLocalTimezone,
                      DATE_FORMAT_LONG_MS,
                    )}
                  </Text>
                </Grid>
              }
            >
              <Grid columnGap={8} data-message-request-uuid={groupUUID} templateColumns="1fr">
                <Text
                  monospace
                  small
                  style={{
                    pointerEvents: 'none',
                  }}
                >
                  {outputText}
                </Text>
              </Grid>
            </TooltipWrapper>,
          );
        }, [],
      ),
    [displayLocalTimezone, executionOutput, getOutput, results, status],
  );

  const runtime = useMemo(() => (timestamps?.max ?? 0) - (timestamps?.min ?? 0), [timestamps]);

  useEffect(() => {
    if (executionOutputProp && !executionOutput) {
      setExecutionOutput(executionOutputProp);
    }
  }, [executionOutput, executionOutputProp]);

  const errorMemo = useMemo(() => {
    return resultsErrors && resultsErrors?.map(({ error, result_id: resultID }) => {
      const {
        code_context_formatted: stacktrace,
        message_formatted: message,
        type,
      } = error ?? {};

      return (
        <Grid key={resultID} rowGap={12} templateColumns="auto" templateRows="auto auto">
          <Grid key={resultID} rowGap={6} templateColumns="auto" templateRows="auto auto">
            <Text monospace secondary semibold small>
              {/* ValueError */}
              <Ansi>{String(type)}</Ansi>
            </Text>

            {/* too many values to unpack (expected 4) */}
            {[message].map(
              (val, idx) =>
                val && (
                  <Text key={`${resultID}-${val}-${idx}`} monospace small>
                    <Ansi>{String(val)}</Ansi>
                  </Text>
                ),
            )}
          </Grid>

          {stacktrace?.length >= 1 && (
            <pre
              style={{
                whiteSpace: 'break-spaces',
              }}
            >
              <Text inline monospace small>
                <Ansi>
                  {stacktrace?.join('\n')}
                </Ansi>
              </Text>
            </pre>
          )}
        </Grid>
      );
    });
  }, [resultsErrors]);

  return (
    <div
      onContextMenu={
        handleContextMenu
          ? event => handleContextMenu(event, messageRequestUUID, results, executionOutput)
          : undefined
      }
      ref={ref}
    >
      {(resultsInformation?.length > 0 || executionOutput || resultsErrors?.length > 0) && (
        <Grid paddingBottom={last ? 6 : 0} paddingTop={first ? 6 : 0} rowGap={4}>
          <Grid autoFlow="column" columnGap={8} justifyContent="space-between">
            <Text monospace muted xsmall>
              {isNumeric(timestamps.min)
                ? dateFormatLongFromUnixTimestamp(
                    convertToMillisecondsTimestamp(Number(timestamps.min)) / 1000,
                    {
                      withSeconds: true,
                    },
                  )
                : timestamps.min}
            </Text>
          </Grid>

          {(resultsInformation?.length > 0 || (!executionOutput && resultsErrors?.length > 0)) && (
            <Scrollbar
              autoHorizontalPadding
              className={[
                styles.executionOutputGroup,
                styles[status],
              ].filter(Boolean).join(' ')}
              hideY
              hideYscrollbar
            >
              <Grid
                className={[
                  styles.executionOutputGroupContainer,
                ].filter(Boolean).join(' ')}
                style={{
                  minHeight: hasOutput ? 32 : undefined,
                }}
              >
                {resultsInformation}

                {!executionOutput && errorMemo}
              </Grid>
            </Scrollbar>
          )}

          {executionOutput && <ExecutionOutput containerRect={containerRect} executionOutput={executionOutput} />}

          {(executionOutput && resultsErrors?.length > 0) && (
            <Scrollbar
              autoHorizontalPadding
              className={[
                styles.executionOutputGroup,
                styles[status],
              ].filter(Boolean).join(' ')}
              hideY
              hideYscrollbar
            >
              <Grid
                className={[
                  styles.executionOutputGroupContainer,
                ].filter(Boolean).join(' ')}
                style={{
                  minHeight: hasOutput ? 32 : undefined,
                }}
              >
                {errorMemo}
              </Grid>
            </Scrollbar>
          )}

          <div>
            <div style={{ height: 4 }}>{loading && <Loading position="absolute" />}</div>

            <Grid autoFlow="column" columnGap={8} justifyContent="space-between">
              <div />

              <Text monospace muted xsmall>
                {formatDurationFromEpoch(runtime)}
              </Text>
            </Grid>
          </div>
        </Grid>
      )}
    </div>
  );
}

export default React.forwardRef(ExecutionResult);
