import EventStreamType from '@interfaces/EventStreamType';
import Grid from '@mana/components/Grid';
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

  const outputs = useMemo(() => events?.map((event: EventStreamType, index: number) => {
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
      status,
      type: resultType,
      uuid: resultUuid,
    } = result;
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

    return (
      <TooltipWrapper
        align={TooltipAlign.START}
        horizontalDirection={TooltipDirection.LEFT}
        justify={TooltipJustify.CENTER}
        key={eventUUID}
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
          templateColumns="auto 1fr"
        >
          <Text monospace muted small>
            [{index}]
          </Text>

          <Text monospace small>
            {outputText}
          </Text  >
        </Grid >
      </TooltipWrapper >
    );
  }), [displayLocalTimezone, events]);

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
