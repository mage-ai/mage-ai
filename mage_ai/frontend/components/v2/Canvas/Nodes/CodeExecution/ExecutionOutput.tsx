import EventStreamType, { ResultType, ExecutionResultType, ExecutionStatusEnum } from '@interfaces/EventStreamType';
import Ansi from 'ansi-to-react';
import useAppEventsHandler, { CustomAppEventEnum } from '../../../Apps/PipelineCanvas/useAppEventsHandler';
import Grid from '@mana/components/Grid';
import React, { useMemo } from 'react';
import Text from '@mana/elements/Text';
import moment from 'moment';
import styles from '@styles/scss/components/Canvas/Nodes/ExecutionOutput.module.scss';
import { DATE_FORMAT_LONG_MS } from '@utils/date';
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/Tooltip';
import { convertToMillisecondsTimestamp, dateFormatLongFromUnixTimestamp } from '@utils/date';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import { formatDurationFromEpoch, isNumeric } from '@utils/string';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

export type ExecutionOutputProps = {
  first?: boolean;
  last?: boolean;
  handleContextMenu?: (event: React.MouseEvent<HTMLDivElement>, messageRequestUUID: string, results: ExecutionResultType[]) => void;
  messageRequestUUID: string;
  results: ExecutionResultType[];
};

function ExecutionOutput({
  first,
  last,
  handleContextMenu,
  messageRequestUUID,
  results,
}: ExecutionOutputProps, ref: React.ForwardedRef<HTMLDivElement>) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const timestamps = useMemo(() => results?.reduce((acc, result) => ({
    max: acc.max === null ? result.timestamp : Math.max(acc.max, result.timestamp),
    min: acc.min === null ? result.timestamp : Math.min(acc.min, result.timestamp),
  }), {
    max: null,
    min: null,
  }), [results]);

  const {
    outputs,
    status,
  } = useMemo(() => results?.reduce(
    (acc: {
      outputs: React.ReactNode[];
      status: ExecutionStatusEnum;
    }, result: ExecutionResultType,
    ) => {
      const {
        data_type,
        error,
        output,
        output_text: outputText,
        process: resultProcess,
        result_id: resultID,
        status,
        timestamp,
        type: resultType,
        uuid: resultUuid,
      } = result;

      if (ResultType.STATUS === resultType && ExecutionStatusEnum.ERROR !== status) {
        acc.status = status;
        return acc;
      }

      const {
        // exitcode,
        // is_alive,
        // message,
        message_request_uuid: groupUUID,
        message_uuid,
        pid,
        timestamp: processTimestamp,
        uuid: processUuid,
      } = resultProcess;

      if (error) {
        const code = error?.code;
        const errors = error?.errors;
        const message = error?.message;
        const type = error?.type;

        acc.status = ExecutionStatusEnum.ERROR;

        acc.outputs.push(
          <Grid
            key={resultID}
            rowGap={12}
            templateColumns="auto"
            templateRows="auto auto"
          >
            <Text monospace semibold small>
              <Ansi>{String(message)}</Ansi>
            </Text>

            {[code, type].map((val) => val && (
              <Text key={val} monospace small>
                <Ansi>{String(val)}</Ansi>
              </Text>
            ))}

            {errors?.length >= 1 && (
              <pre style={{
                whiteSpace: 'break-spaces',
              }}>
                <Text
                  inline
                  monospace
                  small
                >
                  {errors?.map((line: string) => (
                    <Ansi key={line}>{line}</Ansi>
                  ))}
                </Text>
              </pre>
            )}
          </Grid>,
        );
      } else {
        const isFinalOutput = ResultType.DATA === resultType
          && ExecutionStatusEnum.SUCCESS === status;

        acc.outputs.push(
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
                <Text monospace muted
                  small
                  style={{
                    pointerEvents: 'none',
                  }}
                >
                  [{isFinalOutput ? 'output' : (acc?.length ?? 0)}]
                </Text>
                <Text monospace secondary small>
                  {displayLocalOrUtcTime(
                    moment(timestamp).format(DATE_FORMAT_LONG_MS),
                    displayLocalTimezone,
                    DATE_FORMAT_LONG_MS,
                  )}
                </Text>
              </Grid >
            }
          >
            <Grid
              columnGap={8}
              data-message-request-uuid={groupUUID}
              templateColumns="1fr"
            >
              <Text
                monospace
                small
                style={{
                  pointerEvents: 'none',
                }}
              >
                {outputText}
              </Text>
            </Grid >
          </TooltipWrapper>,
        );
      }

      return acc;
    }, {
      outputs: [],
      status: null,
    }), [displayLocalTimezone, results]);

  const runtime = useMemo(() => (timestamps?.max ?? 0) - (timestamps?.min ?? 0), [timestamps]);

  return (
    <div
      onContextMenu={handleContextMenu ? event => handleContextMenu(event, messageRequestUUID, results) : undefined}
      ref={ref}
    >
      {outputs?.length > 0 &&
        <Grid paddingBottom={last ? 6 : 0} paddingTop={first ? 6 : 0} rowGap={4}>
          <Grid autoFlow="column" columnGap={8} justifyContent="space-between">
            <Text monospace muted xsmall>
              {isNumeric(timestamps.min)
                ? dateFormatLongFromUnixTimestamp(
                  convertToMillisecondsTimestamp(Number(timestamps.min)) / 1000, {
                    withSeconds: true,
                  },
                )
                : timestamps.min}
            </Text>
          </Grid>

          <Grid
            className={[
              styles.executionOutputGroup,
              styles[status],
            ].filter(Boolean).join(' ')}
          >
            {outputs}
          </Grid>

          <Grid autoFlow="column" columnGap={8} justifyContent="end">
            <Text monospace muted small>
              {formatDurationFromEpoch(runtime)}
            </Text>
          </Grid>
        </Grid>
      }
    </div>
  );
}

export default React.forwardRef(ExecutionOutput);
