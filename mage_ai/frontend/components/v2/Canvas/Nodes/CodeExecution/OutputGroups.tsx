import { createRoot } from 'react-dom/client';
import { ThemeContext } from 'styled-components';
import ContextProvider from '@context/v2/ContextProvider';
import EventStreamType, {
  ExecutionStatusEnum,
  ExecutionResultType,
  ResultType,
  STATUS_DISPLAY_TEXT,
} from '@interfaces/EventStreamType';
import Text from '@mana/elements/Text';
import { useMutate } from '@context/v2/APIMutation';
import Tag from '@mana/components/Tag';
import { executionDone } from '@components/v2/ExecutionManager/utils';
import ExecutionResult, { ExecutionResultProps } from './ExecutionResult';
import Grid from '@mana/components/Grid';
import React, { createRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Scrollbar from '@mana/elements/Scrollbar';
import stylesOutput from '@styles/scss/components/Canvas/Nodes/OutputGroups.module.scss';
import { groupBy, indexBy, sortByKey } from '@utils/array';
import { ElementRoleEnum } from '@mana/shared/types';
import { ExecutionOutputType } from '@interfaces/CodeExecutionType';
import { capitalize } from '@utils/string';
import { objectSize } from '@utils/hash';

export type OutputGroupsType = {
  handleContextMenu?: ExecutionResultProps['handleContextMenu'];
  onMount?: (consumerID: string, callback?: () => void) => void;
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
  minHeight?: number | string;
  onlyShowWithContent?: boolean;
  role?: ElementRoleEnum;
  styles?: React.CSSProperties;
} & OutputGroupsType;

const OutputGroups: React.FC<OutputGroupsProps> = ({
  children,
  consumerID,
  handleContextMenu,
  hideTimer,
  minHeight = 200,
  onMount,
  onlyShowWithContent,
  role,
  setHandleOnMessage,
  setResultMappingUpdate,
  styles,
}: OutputGroupsProps) => {
  const mutants = useMutate({ resource: 'execution_outputs' });
  const theme = useContext(ThemeContext);

  const resultsMountRef = useRef(null);
  const resultsRootRef = useRef(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLElement>(null);
  const resultsQueueRef = useRef<ExecutionResultType[]>([]);
  const queueIndexRef = useRef<number>(0);
  const timeoutRef = useRef(null);
  const timeoutScrollRef = useRef(null);
  const resultsGroupedByMessageRequestUUIDRef = useRef<Record<string, ExecutionResultType[]>>({});
  const keysRef = useRef<string[]>([]);

  const scrollDown = useCallback((instant?: boolean) => {
    if (instant && scrollableDivRef?.current) {
      scrollableDivRef.current.scrollTop = scrollableDivRef?.current?.scrollHeight;
    } else {
      scrollableDivRef?.current?.scrollTo({
        top: scrollableDivRef?.current.scrollHeight,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resultMappingRef = useRef<Record<string, ExecutionResultType>>({});
  const executionOutputMappingRef = useRef<Record<string, ExecutionOutputType>>({});
  const executingRef = useRef<boolean>(false);

  function renderResults(opts?: { executing?: boolean }) {
    containerRef?.current?.classList?.remove(stylesOutput.hide);

    resultsRootRef.current ||= createRoot(resultsMountRef.current);
    resultsRootRef.current.render(
      <ContextProvider theme={theme}>
        {!hideTimer && executingRef.current && <Tag right statusVariant timer top />}

        {keysRef.current?.map((mrUUID: string, idx: number) => {
          const last = idx === keysRef.current.length - 1;

          return (
            <ExecutionResult
              containerRect={scrollableDivRef.current?.getBoundingClientRect()}
              executing={opts?.executing}
              executionOutput={executionOutputMappingRef.current?.[mrUUID]}
              fetchOutput={fetchOutput}
              first={idx === 0}
              handleContextMenu={handleContextMenu}
              key={mrUUID}
              last={last}
              messageRequestUUID={mrUUID}
              results={resultsGroupedByMessageRequestUUIDRef.current[mrUUID]}
            />
          );
        })}

        <Grid style={{ display: 'none' }} paddingBottom={6}>
          <Text italic monospace muted ref={statusRef} warning xsmall />
        </Grid>
      </ContextProvider>
    );
  }

  function handleResults() {
    const results = resultsQueueRef.current.slice(
      queueIndexRef.current, resultsQueueRef.current.length + 1);

    if (results.length === 0) return;

    const result = results[results.length - 1];
    queueIndexRef.current = resultsQueueRef.current.length;

    resultMappingRef.current = {
      ...resultMappingRef.current,
      ...indexBy(results, (r: ExecutionResultType) => r.result_id),
    };

    resultsGroupedByMessageRequestUUIDRef.current = groupBy(
      Object.values(resultMappingRef.current ?? {}),
      (result: ExecutionResultType) => result.process.message_request_uuid,
    );
    keysRef.current = Object.keys(resultsGroupedByMessageRequestUUIDRef.current ?? {})?.sort();

    const done = executionDone({ result } as any);

    if (done) {
      resultsQueueRef.current = [];
      queueIndexRef.current = 0;
    }
    executingRef.current = !done;

    if (statusRef?.current) {
      const arr = sortByKey(
        resultsGroupedByMessageRequestUUIDRef.current?.[result.process.message_request_uuid],
        (r: ExecutionResultType) => r.timestamp,
        { ascending: false },
      );
      const resultStatus = arr?.filter(
        (r: ExecutionResultType) => r.type === ResultType.STATUS,
      )?.[0];

      if (done) {
        statusRef.current.innerText = '';
        statusRef.current.style.display = 'none';

        const resultOutput: ExecutionResultType = arr?.find(
          (r: ExecutionResultType) => ExecutionStatusEnum.SUCCESS === r.status && ResultType.OUTPUT === r.type
        );
        if (resultOutput) {
          fetchOutput(resultOutput.process.message_request_uuid, {
            query: {
              namespace: resultOutput.metadata.namespace,
              path: resultOutput.metadata.path,
            },
          });
        }
      } else if (resultStatus) {
        statusRef.current.innerText =
          `${capitalize(STATUS_DISPLAY_TEXT[resultStatus?.status] ?? resultStatus?.status)}...`;
        statusRef.current.style.display = 'block';
      }
    }

    renderResults({
      executing: executingRef.current,
    })
    timeoutRef.current = null;
  }

  const fetchOutput = useCallback(
    (id: string, opts: any) => {
      mutants.detail.mutate({
        ...opts,
        id,
        onSuccess: ({ data }) => {
          const xo = data?.execution_output;

          executionOutputMappingRef.current = {
            ...executionOutputMappingRef.current,
            [xo.uuid]: xo,
          };
          renderResults();

          const key = keysRef.current?.[keysRef.current?.length - 1];
          const results = resultsGroupedByMessageRequestUUIDRef.current?.[key];
          const ids = results?.map(r => String(r.process?.message_request_uuid)) ?? [];

          if (ids.includes(key)) {
            timeoutScrollRef.current = setTimeout(() => {
              scrollDown(true);
            }, 100);
          }

          if (opts?.onSuccess) {
            opts.onSuccess(xo);
          }
        },
        query: {
          _limit: 100,
          ...opts?.query,
        },
      });
    },
    [mutants.detail],
  );

  useEffect(() => {
    setResultMappingUpdate(consumerID, (mapping) => {
      Object.values(mapping).forEach((result) => {
        resultsQueueRef.current.push(result);
        if (timeoutRef.current === null) {
          timeoutRef.current = setTimeout(handleResults, 100);
          scrollDown(true);
        }
        scrollDown(true);
      });
      timeoutScrollRef.current = setTimeout(() => {
        scrollDown(true);
      }, 100);
    });

    setHandleOnMessage(consumerID, (event: EventStreamType) => {
      const { result } = event;

      resultsQueueRef.current.push(result);
      if (timeoutRef.current === null) {
        timeoutRef.current = setTimeout(handleResults, 100);
        scrollDown(true);
      }
      timeoutScrollRef.current = setTimeout(() => {
        scrollDown(true);
      }, 100);
    });

    onMount && onMount?.(consumerID, () => {
      timeoutScrollRef.current = setTimeout(() => {
        scrollDown();
      }, 100);
    });

    const ts = timeoutRef.current;
    const tss = timeoutScrollRef.current;

    return () => {
      clearTimeout(ts)
      clearTimeout(tss)
      timeoutRef.current = null;
      timeoutScrollRef.current = null;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={[
        stylesOutput.outputContainer,
        onlyShowWithContent && (keysRef.current?.length ?? 0) === 0 && stylesOutput.hide,
      ].filter(Boolean).join(' ')}
      onContextMenu={!onlyShowWithContent && objectSize(resultMappingRef?.current ?? {}) === 0
        ? e => handleContextMenu(e)
        : undefined
      }
      ref={containerRef}
      role={role}
      style={{
        ...styles,
        minHeight,
      }}
    >
      {children}

      <Scrollbar
        autoHorizontalPadding
        hideX
        ref={scrollableDivRef}
        showY
        style={{ maxHeight: 600, overflow: 'auto', width: 600 }}
      >
        <Grid ref={resultsMountRef} rowGap={16} templateRows="min-content" />
      </Scrollbar>
    </div>
  );
};

export default OutputGroups;
