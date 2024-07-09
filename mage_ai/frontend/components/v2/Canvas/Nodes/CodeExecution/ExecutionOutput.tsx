import EventStreamType, { ResultType } from '@interfaces/EventStreamType';
import Grid from '@mana/components/Grid';
import Link from '@mana/elements/Link';
import React, { useMemo } from 'react';
import Text from '@mana/elements/Text';
import moment from 'moment';
import styles from '@styles/scss/components/Canvas/Nodes/ExecutionOutput.module.scss';
import { DATE_FORMAT_LONG_MS } from '@utils/date';
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/Tooltip';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

export type ExecutionOutputProps = {
  events: EventStreamType[];
};

function ExecutionOutput({
  events,
}: ExecutionOutputProps, ref: React.ForwardedRef<HTMLDivElement>) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const outputs = useMemo(() => events?.reduce(
    (acc: React.ReactNode[], event: EventStreamType,
    ) => {
      const {
        error,
        event_uuid: eventUUID,
        result,
        timestamp,
        type,
        uuid,
      } = event;
      const {
        data_type,
        error: resultError,
        output,
        output_text: outputText,
        process: resultProcess,
        result_id: resultID,
        status,
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
      } = error ?? resultError ?? {};

      return acc.concat(
        <TooltipWrapper
          align={TooltipAlign.END}
          horizontalDirection={TooltipDirection.RIGHT}
          justify={TooltipJustify.CENTER}
          key={resultID}
          tooltip={
            <Text monospace secondary small>
              {displayLocalOrUtcTime(
                moment(timestamp).format(DATE_FORMAT_LONG_MS),
                displayLocalTimezone,
                DATE_FORMAT_LONG_MS,
              )}
            </Text>
          }
        >
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
              [{acc?.length ?? 0}]
            </Text>

            <Text
              monospace
              small
              style={{
                pointerEvents: 'none',
              }}
            >
              {outputText}
            </Text   >
          </Grid >
        </TooltipWrapper >
      );
    }, []), [displayLocalTimezone, events]);

  return (
    <div ref={ref}>
      {outputs?.length > 0 &&
        <Grid className={styles.executionOutputGroup}>
          {outputs}
        </Grid  >
      }
    </div>
  );
}

export default React.forwardRef(ExecutionOutput);
