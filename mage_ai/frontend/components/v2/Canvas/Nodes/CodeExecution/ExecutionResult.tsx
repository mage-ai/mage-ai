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
            status,
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

          const isFinalOutput =
            ResultType.DATA === resultType && ExecutionStatusEnum.SUCCESS === status;

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
    [displayLocalTimezone, results],
  );

  const runtime = useMemo(() => (timestamps?.max ?? 0) - (timestamps?.min ?? 0), [timestamps]);
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

  useEffect(() => {
    if (executionOutputProp && !executionOutput) {
      setExecutionOutput(executionOutputProp);
    }
  }, [executionOutput, executionOutputProp]);

  const status = useMemo(() => {
    if (resultsErrors?.length > 0) {
      return ExecutionStatusEnum.ERROR;
    }

    if (success) {
      return ExecutionStatusEnum.SUCCESS;
    }

    return results?.find(r => ResultType.STATUS === r.type)?.status;
  }, [results, resultsErrors, success]);

  return (
    <div
      onContextMenu={
        handleContextMenu
          ? event => handleContextMenu(event, messageRequestUUID, results, executionOutput)
          : undefined
      }
      ref={ref}
    >
      {resultsInformation?.length > 0 && (
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
                minHeight: hasOutput ? 40 : undefined,
              }}
            >
              {resultsInformation}

              {resultsErrors && resultsErrors?.map(({ error, result_id: resultID }) => {
                const code = error?.code;
                const errors = error?.errors;
                const message = error?.message;
                const type = error?.type;

                return (

                  <Grid key={resultID} rowGap={12} templateColumns="auto" templateRows="auto auto">
                    <Text monospace semibold small>
                      <Ansi>{String(message)}</Ansi>
                    </Text>

                    {[code, type].map(
                        val =>
                          val && (
                            <Text key={val} monospace small>
                              <Ansi>{String(val)}</Ansi>
                            </Text>
                          ),
                      )}

                    {errors?.length >= 1 && (
                      <pre
                        style={{
                          whiteSpace: 'break-spaces',
                        }}
                      >
                        <Text inline monospace small>
                          {errors?.map((line: string) => <Ansi key={line}>{line}</Ansi>)}
                        </Text>
                      </pre>
                    )}
                  </Grid>
                );
              })}

              {hasOutput && !executionOutput && (
                <Link onClick={() => getOutput()} xsmall>
                  Load output
                </Link>
              )}
            </Grid>
          </Scrollbar>

          {executionOutput && <ExecutionOutput containerRect={containerRect} executionOutput={executionOutput} />}

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
