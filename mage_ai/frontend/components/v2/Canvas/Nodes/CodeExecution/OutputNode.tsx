import BlockType from '@interfaces/BlockType';
import Grid from '@mana/components/Grid';
import ExecutionOutput from './ExecutionOutput';
import React, { useRef, useMemo, useEffect, useState } from 'react';
import stylesOutput from '@styles/scss/components/Canvas/Nodes/OutputNode.module.scss';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { CanvasNodeType } from '../interfaces';
import { NodeWrapper } from '../NodeWrapper';
import { OutputNodeType } from '../../interfaces';
import { areEqual } from '../equals';
import { draggableProps } from '../draggable/utils';
import { setupDraggableHandlers } from '../utils';
import EventStreamType from '@interfaces/EventStreamType';

type OutputNodeProps = {
  node: OutputNodeType;
  nodeRef: React.RefObject<HTMLDivElement>;
  useRegistration: (channel: string, stream: string) => { subscribe: (consumer: string, opts?: any) => void };
} & CanvasNodeType;

const OutputNode: React.FC<OutputNodeProps> = ({
  draggable,
  handlers,
  node,
  nodeRef,
  rect,
  useRegistration,
}: OutputNodeProps) => {
  const block = node.block;
  const [eventsGrouped, setEventsGrouped] = useState<Record<string, Record<string, EventStreamType>>>({});
  const { subscribe } = useRegistration(undefined, block.uuid);
  const handleMessage = useRef((event: EventStreamType) => {
    console.log('OMGGGGGGGGGGGGGGG', event)
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

  const draggingHandlers = setupDraggableHandlers(handlers, node, nodeRef, block);

  const sharedProps = useMemo(() => draggableProps({
    classNames: [
      stylesOutput.outputNodeContainer,
      styles.outputContainer,
      styles.ready,
    ],
    draggable,
    excludeClassNames: [
      styles.container,
    ],
    node,
  }), [draggable, node]);

  console.log(eventsGrouped)

  return (
    <NodeWrapper
      {...sharedProps}
      handlers={draggingHandlers}
      node={node}
      nodeRef={nodeRef}
      rect={rect}
    >
      <Grid templateRows="min-content" rowGap={8}>
        {Object.keys(eventsGrouped ?? {})?.sort()?.map((mrUUID: string) => (
          <ExecutionOutput
            events={Object.values(eventsGrouped?.[mrUUID] ?? {}).sort()}
            key={mrUUID}
          />
        ))}
      </Grid  >
    </NodeWrapper>
  );
}

export default React.memo(OutputNode, areEqual);
