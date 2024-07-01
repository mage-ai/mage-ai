import EventStreamType, { ProcessDetailsType } from '@interfaces/EventStreamType';
import React, { useEffect, useState } from 'react';
import { DEBUG } from '@components/v2/utils/debug';

export type ExecutionOutputProps = {
  onEventRef: React.MutableRefObject<(event: EventStreamType) => void>;
  process: ProcessDetailsType;
};

function ExecutionOutput({
  onEventRef,
  process,
}: ExecutionOutputProps, ref: React.ForwardedRef<HTMLDivElement>) {
  const [events, setEvents] = useState<EventStreamType[]>([]);

  useEffect(() => {
    DEBUG.codeExecution.manager && console.log('Group added', process);

    onEventRef.current = (event: EventStreamType) => {
      if (event?.result?.process?.message_request_uuid !== process?.message_request_uuid) return;

      setEvents((prevEvents: EventStreamType[]) => [...prevEvents, event]);
      DEBUG.codeExecution.manager && console.log('Event received', process, event);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div ref={ref}>

    </div >
  );
}

export default React.forwardRef(ExecutionOutput);
