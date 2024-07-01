import EventStreamType, { ProcessDetailsType } from '@interfaces/EventStreamType';
import React, { useEffect, useMemo, useState } from 'react';
import Text from '@mana/elements/Text';
import moment from 'moment';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { DEBUG } from '@components/v2/utils/debug';
import { DATE_FORMAT_LONG_MS } from '@utils/date';
import Grid from '@mana/components/Grid';

export type ExecutionOutputProps = {
  process: ProcessDetailsType;
  setEventStreamHandler: (handler: (event: EventStreamType) => void) => void;
};

function ExecutionOutput({
  process,
  setEventStreamHandler,
}: ExecutionOutputProps, ref: React.ForwardedRef<HTMLDivElement>) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const [events, setEvents] = useState<EventStreamType[]>([]);

  useEffect(() => {
    setEventStreamHandler((event: EventStreamType) => {
      if (event?.result?.process?.message_request_uuid !== process?.message_request_uuid) return;

      setEvents((prevEvents: EventStreamType[]) => [...prevEvents, event]);
      DEBUG.codeExecution.manager && console.log('[ExecutionOutput]', process, event);
    })

    DEBUG.codeExecution.manager && console.log('[ExecutionOutput] Group added', process);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEventStreamHandler]);

  const outputs = useMemo(() => events?.map((event: EventStreamType) => {
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
      message_request_uuid,
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
      <Grid key={eventUUID}>

        <Text monospace muted>
          {displayLocalOrUtcTime(
            moment(timestamp).format(DATE_FORMAT_LONG_MS),
            displayLocalTimezone,
            DATE_FORMAT_LONG_MS,
          )}
        </Text>

        <Text>
          {outputText}
        </Text>
      </Grid >
    );
  }), [displayLocalTimezone, events]);

  return (
    <Grid ref={ref}>
      {outputs}
    </Grid >
  );
}

export default React.forwardRef(ExecutionOutput);
