import { createRoot, Root } from 'react-dom/client';
import { EventEnum } from '@mana/events/enums';
import useCustomEventHandler from '@mana/events/useCustomEventHandler';
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
  handleContextMenu?: (
    event: React.MouseEvent<HTMLDivElement>,
    executionOutput: ExecutionOutputType,
    opts?: {
      onDelete: (xo: ExecutionOutputType) => void;
      onDeleteAll: () => void;
    },
  ) => void;
  onMount?: (consumerID: string, callback?: () => void) => void;
  setHandleOnMessage?: (consumerID: string, handler: (event: EventStreamType) => void) => void;
  setExecutionOutputsUpdate?: (
    consumerID: string,
    handler: (mapping: Record<string, ExecutionOutputType>) => void,
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
  setExecutionOutputsUpdate,
  styles,
}: OutputGroupsProps) => {
  const mutants = useMutate({ resource: 'execution_outputs' });
  const theme = useContext(ThemeContext);

  const outputMountRef = useRef(null);
  const resultRootsRef = useRef<Record<string, {
    node: Element;
    root: Root;
  }>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const resultElementRefs = useRef<Record<string, React.MutableRefObject<HTMLDivElement>>>({});

  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef(null);
  const timeoutScrollRef = useRef(null);

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

  const executionOutputMappingRef = useRef<Record<string, ExecutionOutputType>>({});
  const executingRef = useRef<boolean>(false);

  const fetchOutput = useCallback(
    (id: string, opts: any) => {
      mutants.detail.mutate({
        id,
        onSuccess: ({ data }) => {
          const xo = data?.execution_output;

          executionOutputMappingRef.current[xo.uuid] = xo;
          renderResults();

          if (opts?.onSuccess) {
            opts.onSuccess(xo);
          }
        },
        query: opts?.query,
      });
    },
    [mutants.detail],
  );

  const contextMenuProps = useMemo(() => ({
    onDelete: (xo) => {
      resultRootsRef.current[xo.uuid]?.root?.render(null);
      resultRootsRef.current[xo.uuid]?.root?.unmount();
      resultRootsRef.current[xo.uuid]?.node?.remove();
      delete resultRootsRef.current[xo.uuid];
      delete executionOutputMappingRef.current[xo.uuid];
    },
    onDeleteAll: () => {
      Object.values(resultRootsRef.current ?? {})?.forEach(({
        node,
        root,
      }) => {
        root?.render(null);
        root?.unmount();
        node?.remove();
      });

      executionOutputMappingRef.current = {};
      resultRootsRef.current = {};
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  function renderResults(opts?: { executing?: boolean }) {
    const xos = getExecutionOutputs(true);
    const xosn = xos?.length ?? 0;

    xos?.forEach((xo: ExecutionOutputType, idx: number) => {
      if (resultRootsRef?.current?.[xo.uuid]) return;

      const node = document.createElement('div');
      outputMountRef.current.appendChild(node);

      resultRootsRef.current[xo.uuid] = {
        node,
        root: createRoot(node),
      };

      resultRootsRef.current[xo.uuid].root.render(
        <ContextProvider theme={theme as any}>
          <ExecutionResult
            containerRect={scrollableDivRef.current?.getBoundingClientRect()}
            executing={opts?.executing}
            executionOutput={xo}
            fetchOutput={fetchOutput}
            first={idx === 0}
            handleContextMenu={(a, b) => {
              handleContextMenu(a, b, contextMenuProps);
            }}
            key={xo.uuid}
            last={idx === xosn - 1}
            ref={resultElementRefs.current[xo.uuid]}
          />
        </ContextProvider>
      );
    });
  }

  const { dispatchCustomEvent } = useCustomEventHandler({
    executionOutputMappingRef,
  });

  function appendResultForOutput(result: ExecutionResultType) {
    const uuid = result?.process?.message_request_uuid;
    executionOutputMappingRef.current[uuid] ||= {
      messages: [],
      messagesMapping: {},
      namespace: null,
      path: null,
      uuid: uuid,
    };
    if (!(result.result_id in executionOutputMappingRef.current[uuid].messagesMapping)) {
      executionOutputMappingRef.current[uuid].messages.push(result);
      executionOutputMappingRef.current[uuid].messagesMapping[result.result_id] = result;
    }
  }

  function getExecutionOutputs(ascending: boolean = false): ExecutionOutputType[] {
    return sortByKey(
      Object.entries(executionOutputMappingRef.current ?? {}),
      ([uuid]) => uuid,
      { ascending },
    ).map(([_, value]) => value);
  }

  function updateExecutionStatus(result: ExecutionResultType) {

    const xo = executionOutputMappingRef.current[result?.process?.message_request_uuid];
    executingRef.current = xo?.messages?.every((r) => !executionDone({ result: r } as any));

    if (executingRef.current) {
      statusRef?.current?.classList?.remove(stylesOutput.fadeOut);
      statusRef.current.innerText =
        `${capitalize(STATUS_DISPLAY_TEXT[result?.status] ?? result?.status)}...`;
    } else {
      statusRef?.current?.classList?.add(stylesOutput.fadeOut);
      statusRef.current.innerText = '';
    }
  }

  useEffect(() => {
    setExecutionOutputsUpdate(consumerID, (mapping: Record<string, ExecutionOutputType>) => {
      Object.entries(mapping ?? {}).forEach(([uuid, xo]) => {
        executionOutputMappingRef.current[uuid] = {
          ...executionOutputMappingRef.current[uuid],
          ...xo,
        };
      })
    });

    setHandleOnMessage(consumerID, (event: EventStreamType) => {
      const { result } = event;

      appendResultForOutput(result);
      updateExecutionStatus(result);
      renderResults({ executing: executingRef.current });
      dispatchCustomEvent(EventEnum.EVENT_STREAM_MESSAGE, {
        executionOutput: executionOutputMappingRef.current[result?.process?.message_request_uuid],
        result,
      });
      scrollDown(true);
    });

    const scroll = () => {
      timeoutScrollRef.current = setTimeout(() => {
        scrollDown();
      }, 1000);
    };

    if (onMount) {
      onMount?.(consumerID, () => scroll());
    } else {
      scroll();
    }

    const ts = timeoutRef.current;
    const tss = timeoutScrollRef.current;

    return () => {
      clearTimeout(ts)
      clearTimeout(tss)
      timeoutRef.current = null;
      timeoutScrollRef.current = null;
      executingRef.current = false;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={[
        stylesOutput.outputContainer,
      ].filter(Boolean).join(' ')}
      onContextMenu={e => handleContextMenu(e, null, contextMenuProps)}
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
        <Grid ref={outputMountRef} rowGap={16} templateRows="min-content" />

        <Grid style={{ height: 20 }} paddingBottom={6}>
          <Text italic monospace muted ref={statusRef} warning xsmall />
        </Grid>
      </Scrollbar>
    </div>
  );
};

export default OutputGroups;
