import EventStreamType from '@interfaces/EventStreamType';
import ExecutionOutput from './ExecutionOutput';
import Scrollbar from '@mana/elements/Scrollbar';
import stylesOutput from '@styles/scss/components/Canvas/Nodes/OutputGroups.module.scss';
import Grid from '@mana/components/Grid';
import React, { useEffect, useRef, useState } from 'react';
import { OutputNodeType } from '../../interfaces';
import BlockType from '@interfaces/BlockType';
import { DEBUG } from '@components/v2/utils/debug';
import { isEmptyObject } from '@utils/hash';

type OutputGroupsProps = {
  block: BlockType
  node: OutputNodeType;
  onMount?: () => void;
  source?: string;
  useRegistration: (channel: string, stream: string) => { subscribe: (consumer: string, opts?: any) => void };
}

const OutputGroups: React.FC<OutputGroupsProps> = ({
  block: blockProp,
  node,
  onMount,
  source,
  useRegistration,
}: OutputGroupsProps) => {
  const scrollableDivRef = useRef<HTMLDivElement>(null);

  const block = blockProp || node?.block;
  const [eventsGrouped, setEventsGrouped] = useState<Record<string, Record<string, EventStreamType>>>({});
  const { subscribe } = useRegistration(undefined, block?.uuid);
  const handleMessage = useRef((event: EventStreamType) => {
    DEBUG.execution.output && console.log('event.result', JSON.stringify(event.result, null, 2));

    setEventsGrouped((prev) => ({
      ...prev,
      [event.result.process.message_request_uuid]: {
        ...(prev?.[event.result.process.message_request_uuid] ?? {}),
        [event.event_uuid]: event,
      },
    }));
  });

  subscribe([node.id, 'output', source ?? ''].join(':'), {
    onMessage: handleMessage.current,
  });

  useEffect(() => {
    onMount?.();
  }, [onMount]);

  useEffect(() => {
    scrollableDivRef.current?.scrollTo({
      top: scrollableDivRef.current.scrollHeight,
    });
  }, [eventsGrouped]);

  if (isEmptyObject(eventsGrouped)) {
    return;
  }

  return (
    <div className={stylesOutput.outputContainer}>
      <Scrollbar ref={scrollableDivRef} style={{ maxHeight: 400, overflow: 'auto' }}>
        <Grid rowGap={8} templateRows="min-content">
          {Object.keys(eventsGrouped ?? {})?.sort()?.map((mrUUID: string) => (
            <ExecutionOutput
              events={Object.values(eventsGrouped?.[mrUUID] ?? {}).sort()}
              key={mrUUID}
            />
          ))}
        </Grid>
      </Scrollbar >
    </div>
  );
}

export default OutputGroups;
