import EventStreamType from '@interfaces/EventStreamType';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from '../../../Apps/PipelineCanvas/useAppEventsHandler';
import ExecutionOutput from './ExecutionOutput';
import Scrollbar from '@mana/elements/Scrollbar';
import stylesOutput from '@styles/scss/components/Canvas/Nodes/OutputGroups.module.scss';
import Grid from '@mana/components/Grid';
import React, { useEffect, useRef, useState } from 'react';
import { OutputNodeType } from '../../interfaces';
import { DEBUG } from '@components/v2/utils/debug';
import { isEmptyObject } from '@utils/hash';
import { groupBy } from '@utils/array';

export type OutputGroupsType = {
  handleOnMessageRef?: React.MutableRefObject<(event: EventStreamType) => void>;
  node: OutputNodeType;
}

type OutputGroupsProps = {
  styles?: React.CSSProperties;
} & OutputGroupsType;

const OutputGroups: React.FC<OutputGroupsProps> = ({
  handleOnMessageRef,
  node,
  styles,
}: OutputGroupsProps) => {
  const scrollableDivRef = useRef<HTMLDivElement>(null);

  const [eventsGrouped, setEventsGrouped] =
    useState<Record<string, Record<string, EventStreamType>>>(node?.eventStreams);

  const { dispatchAppEvent } = useAppEventsHandler(node as any);

  useEffect(() => {
    if (!handleOnMessageRef?.current) {
      handleOnMessageRef.current = (event: EventStreamType) => {
        DEBUG.codeExecution.output && console.log('event.result', JSON.stringify(event.result, null, 2));

        setEventsGrouped((prev) => {
          const eventStreams = {
            ...prev,
            [event.result.process.message_request_uuid]: {
              ...(prev?.[event.result.process.message_request_uuid] ?? {}),
              [event.result.result_id]: event,
            },
          };

          dispatchAppEvent(CustomAppEventEnum.OUTPUT_UPDATED, {
            eventStreams,
            node: node.node,
            output: node,
          });

          return eventStreams;
        });
      };
    }
  }, [dispatchAppEvent, handleOnMessageRef, node]);

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
            />
          ))}
        </Grid>
      </Scrollbar  >
    </div>
  );
}

export default OutputGroups;
