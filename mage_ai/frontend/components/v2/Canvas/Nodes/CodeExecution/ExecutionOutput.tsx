import EventStreamType, { ResultType, ExecutionResultType, ExecutionStatusEnum } from '@interfaces/EventStreamType';
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
  results: ExecutionResultType[];
  uuid: string;
};

function ExecutionOutput({
  results,
  uuid,
}: ExecutionOutputProps, ref: React.ForwardedRef<HTMLDivElement>) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const timestamps = useMemo(() => results?.reduce((acc, result) => ({
    max: acc.max === null ? result.timestamp : Math.max(acc.max, result.timestamp),
    min: acc.min === null ? result.timestamp : Math.min(acc.min, result.timestamp),
  }), {
    max: null,
    min: null,
  }), [results]);

  const outputs = useMemo(() => results?.reduce(
    (acc: React.ReactNode[], result: ExecutionResultType,
    ) => {
      const {
        data_type,
        error: resultError,
        output,
        output_text: outputText,
        process: resultProcess,
        result_id: resultID,
        status,
        timestamp,
        type: resultType,
        uuid: resultUuid,
      } = result;

      if (ResultType.STATUS === resultType) {
        return acc;
      }

      const {
        exitcode,
        is_alive,
        message,
        message_request_uuid: groupUUID,
        message_uuid,
        pid,
        timestamp: processTimestamp,
        uuid: processUuid,
      } = resultProcess;
      const {
        code,
        errors,
        message: resultMessage,
        type: errorType,
      } = resultError ?? {};

      const isFinalOutput = ResultType.DATA === resultType
        && ExecutionStatusEnum.SUCCESS === status;

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
    }, []), [displayLocalTimezone, results]);

  const runtime = useMemo(() => (timestamps?.max ?? 0) - (timestamps?.min ?? 0), [timestamps]);

  return (
    <div ref={ref}>
      {outputs?.length > 0 &&
        <Grid rowGap={4}>
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

          <Grid className={styles.executionOutputGroup}>
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
