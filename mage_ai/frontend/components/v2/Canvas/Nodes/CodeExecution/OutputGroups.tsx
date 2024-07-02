import EventStreamType from '@interfaces/EventStreamType';
import ExecutionOutput from './ExecutionOutput';
import Grid from '@mana/components/Grid';
import React, { useRef, useState } from 'react';
import { OutputNodeType } from '../../interfaces';
import BlockType from '@interfaces/BlockType';

type OutputGroupsProps = {
  block: BlockType
  node: OutputNodeType;
  useRegistration: (channel: string, stream: string) => { subscribe: (consumer: string, opts?: any) => void };
}

const OutputGroups: React.FC<OutputGroupsProps> = ({
  block: blockProp,
  node,
  useRegistration,
}: OutputGroupsProps) => {
  const block = blockProp ?? node?.block;
  const [eventsGrouped, setEventsGrouped] = useState<Record<string, Record<string, EventStreamType>>>({});
  const { subscribe } = useRegistration(undefined, block.uuid);
  const handleMessage = useRef((event: EventStreamType) => {
    setEventsGrouped((prev) => ({
      ...prev,
      [event.result.process.message_request_uuid]: {
        ...(prev?.[event.result.process.message_request_uuid] ?? {}),
        [event.event_uuid]: event,
      },
    }));
  });

  subscribe([node.id, 'output'].join(':'), {
    onMessage: handleMessage.current,
  });

  return (
    <Grid rowGap={8} templateRows="min-content">
      {Object.keys(eventsGrouped ?? {})?.sort()?.map((mrUUID: string) => (
        <ExecutionOutput
          events={Object.values(eventsGrouped?.[mrUUID] ?? {}).sort()}
          key={mrUUID}
        />
      ))}
    </Grid>
  );
}

export default OutputGroups;
