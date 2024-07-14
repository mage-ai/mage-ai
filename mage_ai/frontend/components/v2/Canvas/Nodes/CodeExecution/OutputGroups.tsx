import EventStreamType from '@interfaces/EventStreamType';
import ExecutionOutput from './ExecutionOutput';
import Grid from '@mana/components/Grid';
import React, { useEffect, useRef, useState } from 'react';
import Scrollbar from '@mana/elements/Scrollbar';
import stylesOutput from '@styles/scss/components/Canvas/Nodes/OutputGroups.module.scss';
import { DEBUG } from '@components/v2/utils/debug';

export type OutputGroupsType = {
  consumerID: string;
  setHandleOnMessage?: (consumerID: string, handler: (event: EventStreamType) => void) => void;
};

type OutputGroupsProps = {
  styles?: React.CSSProperties;
} & OutputGroupsType;

const OutputGroups: React.FC<OutputGroupsProps> = ({
  consumerID,
  setHandleOnMessage,
  styles,
}: OutputGroupsProps) => {
  const scrollableDivRef = useRef<HTMLDivElement>(null);

  const [eventsGrouped, setEventsGrouped] =
    useState<Record<string, Record<string, EventStreamType>>>({});

  useEffect(() => {
    setHandleOnMessage && setHandleOnMessage?.(consumerID, (event: EventStreamType) => {
      DEBUG.codeExecution.output
        && console.log('event.result', JSON.stringify(event.result, null, 2));

      const { result } = event;
      setEventsGrouped((prev) => {
        const eventStreams = {
          ...prev,
          [result.process.message_request_uuid]: {
            ...(prev?.[result.process.message_request_uuid] ?? {}),
            [result.result_id]: event,
          },
        };
        return eventStreams;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollableDivRef.current?.scrollTo({
      top: scrollableDivRef.current.scrollHeight,
    });
  }, [eventsGrouped]);

  return (
    <div className={stylesOutput.outputContainer} style={styles}>
      <Scrollbar autoHorizontalPadding ref={scrollableDivRef} style={{ maxHeight: 400, overflow: 'auto' }}>
        <Grid rowGap={8} templateRows="min-content">
          {Object.keys(eventsGrouped ?? {})?.sort()?.map((mrUUID: string) => (
            <ExecutionOutput
              events={Object.values(eventsGrouped?.[mrUUID] ?? {}).sort()}
              key={mrUUID}
              uuid={mrUUID}
            />
          ))}
        </Grid>
      </Scrollbar>
    </div>
  );
};

export default OutputGroups;
