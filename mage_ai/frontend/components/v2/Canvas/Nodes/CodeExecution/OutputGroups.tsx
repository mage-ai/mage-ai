import EventStreamType, { ExecutionResultType } from '@interfaces/EventStreamType';
import ExecutionOutput from './ExecutionOutput';
import Grid from '@mana/components/Grid';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Scrollbar from '@mana/elements/Scrollbar';
import stylesOutput from '@styles/scss/components/Canvas/Nodes/OutputGroups.module.scss';
import { DEBUG } from '@components/v2/utils/debug';
import { groupBy, indexBy } from '@utils/array';

export type OutputGroupsType = {
  onMount?: (consumerID: string) => void;
  setHandleOnMessage?: (consumerID: string, handler: (event: EventStreamType) => void) => void;
  setResultMappingUpdate?: (
    consumerID: string,
    handler: (resultMapping: Record<string, ExecutionResultType>) => void,
  ) => void;
};

type OutputGroupsProps = {
  consumerID: string;
  styles?: React.CSSProperties;
} & OutputGroupsType;

const OutputGroups: React.FC<OutputGroupsProps> = ({
  consumerID,
  onMount,
  setHandleOnMessage,
  setResultMappingUpdate,
  styles,
}: OutputGroupsProps) => {
  const scrollableDivRef = useRef<HTMLDivElement>(null);

  const [resultMapping, setResultMapping] = useState<Record<string, ExecutionResultType>>({});
  const resultsGroupedByMessageRequestUUID = useMemo(
    () => groupBy(Object.values(resultMapping ?? {}),
      (result: ExecutionResultType) => result.process.message_request_uuid),
    [resultMapping]);

  useEffect(() => {
    setResultMappingUpdate && setResultMappingUpdate?.(
      consumerID,
      setResultMapping,
    );

    setHandleOnMessage && setHandleOnMessage?.(consumerID, (event: EventStreamType) => {
      DEBUG.codeExecution.output
        && console.log('event.result', JSON.stringify(event.result, null, 2));

      const { result } = event;
      setResultMapping((prev) => ({
        ...prev,
        [result.result_id]: result,
      }));
    });

    onMount && onMount?.(consumerID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollableDivRef.current?.scrollTo({
      top: scrollableDivRef.current.scrollHeight,
    });
  }, [resultsGroupedByMessageRequestUUID]);

  return (
    <div className={stylesOutput.outputContainer} style={styles}>
      <Scrollbar autoHorizontalPadding ref={scrollableDivRef} style={{ maxHeight: 400, overflow: 'auto' }}>
        <Grid rowGap={8} templateRows="min-content">
          {Object.keys(
            resultsGroupedByMessageRequestUUID ?? {},
          )?.sort()?.map((mrUUID: string) => (
            <ExecutionOutput
              key={mrUUID}
              results={resultsGroupedByMessageRequestUUID[mrUUID]}
              uuid={mrUUID}
            />
          ))}
        </Grid>
      </Scrollbar>
    </div>
  );
};

export default OutputGroups;
