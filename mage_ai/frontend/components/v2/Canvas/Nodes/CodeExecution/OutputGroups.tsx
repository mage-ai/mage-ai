import EventStreamType, { ExecutionResultType } from '@interfaces/EventStreamType';
import Tag from '@mana/components/Tag';
import { executionDone } from '@components/v2/ExecutionManager/utils';
import ExecutionOutput, { ExecutionOutputProps } from './ExecutionOutput';
import Grid from '@mana/components/Grid';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Scrollbar from '@mana/elements/Scrollbar';
import stylesOutput from '@styles/scss/components/Canvas/Nodes/OutputGroups.module.scss';
import { DEBUG } from '@components/v2/utils/debug';
import { groupBy, indexBy } from '@utils/array';
import { ElementRoleEnum } from '@mana/shared/types';

export type OutputGroupsType = {
  handleContextMenu?: ExecutionOutputProps['handleContextMenu'];
  onMount?: (consumerID: string) => void;
  setHandleOnMessage?: (consumerID: string, handler: (event: EventStreamType) => void) => void;
  setResultMappingUpdate?: (
    consumerID: string,
    handler: (resultMapping: Record<string, ExecutionResultType>) => void,
  ) => void;
};

type OutputGroupsProps = {
  children?: React.ReactNode;
  consumerID: string;
  hideTimer?: boolean;
  role?: ElementRoleEnum;
  styles?: React.CSSProperties;
} & OutputGroupsType;

const OutputGroups: React.FC<OutputGroupsProps> = ({
  children,
  consumerID,
  handleContextMenu,
  hideTimer,
  onMount,
  role,
  setHandleOnMessage,
  setResultMappingUpdate,
  styles,
}: OutputGroupsProps) => {
  const scrollableDivRef = useRef<HTMLDivElement>(null);

  const [executing, setExecuting] = useState<boolean>(false);
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

      const done = executionDone(event);
      setExecuting(!done);

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

  const keys = useMemo(() => Object.keys(
    resultsGroupedByMessageRequestUUID ?? {},
  )?.sort(), [resultsGroupedByMessageRequestUUID]);

  return (
    <div className={stylesOutput.outputContainer} role={role} style={styles}>
      {!hideTimer && executing && <Tag right statusVariant timer top />}

      {children}

      <Scrollbar
        autoHorizontalPadding ref={scrollableDivRef} style={{ maxHeight: 400, overflow: 'auto' }}
      >
        <Grid rowGap={8} templateRows="min-content">
          {keys?.map((mrUUID: string, idx: number) => (
            <ExecutionOutput
              first={idx === 0}
              handleContextMenu={handleContextMenu}
              key={mrUUID}
              last={idx === keys.length - 1}
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
