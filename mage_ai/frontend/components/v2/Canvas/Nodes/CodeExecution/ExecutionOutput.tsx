import EventStreamType, { ProcessDetailsType } from '@interfaces/EventStreamType';
import Grid from '@mana/components/Grid';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Text from '@mana/elements/Text';
import moment from 'moment';
import { DATE_FORMAT_LONG_MS } from '@utils/date';
import { DEBUG } from '@components/v2/utils/debug';
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/Tooltip';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

export type ExecutionOutputProps = {
  onMount?: () => void;
  process: ProcessDetailsType;
  setEventStreamHandler: (handler: (event: EventStreamType) => void) => void;
};

function ExecutionOutput({
  onMount,
  process,
  setEventStreamHandler,
}: ExecutionOutputProps, ref: React.ForwardedRef<HTMLDivElement>) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const phaseRef = useRef(0);
  const [events, setEvents] = useState<EventStreamType[]>([]);

  useEffect(() => {
    setEventStreamHandler((event: EventStreamType) => {
      if (event?.result?.process?.message_request_uuid !== process?.message_request_uuid) return;

      DEBUG.codeExecution.manager && console.log('[ExecutionOutput] Event received', process, event);
      setEvents((prevEvents: EventStreamType[]) => [...prevEvents, event]);
    });

    if (phaseRef.current === 0) {
      DEBUG.codeExecution.manager && console.log('[ExecutionOutput] onMount', process);
      onMount && onMount?.();
    }

    phaseRef.current += 1;

    DEBUG.codeExecution.manager && console.log('[ExecutionOutput] Group added', process);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEventStreamHandler]);

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
            [{index}][{groupUUID}]
          </Text>

          <Text monospace small>
            {outputText}
          </Text  >
        </Grid >
      </TooltipWrapper >
    );
  }), [displayLocalTimezone, events]);

  return (
    <Grid ref={ref}>
      {outputs}
    </Grid >
  );
}

export default React.forwardRef(ExecutionOutput);
