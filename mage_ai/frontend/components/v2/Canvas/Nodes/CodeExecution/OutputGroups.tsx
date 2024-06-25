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
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { groupBy, indexBy, sortByKey } from '@utils/array';
import { ElementRoleEnum } from '@mana/shared/types';
import { ExecutionOutputType } from '@interfaces/CodeExecutionType';
import { capitalize } from '@utils/string';
import { objectSize } from '@utils/hash';

export const DEFAULT_RECT = {
  height: 600,
  width: 600,
};

export type OutputGroupsType = {
  handleContextMenu?: (
    event: React.MouseEvent<HTMLDivElement>,
    executionOutput: ExecutionOutputType,
    opts?: {
      onDelete: (xo: ExecutionOutputType) => void;
      onDeleteAll: () => void;
    },
  ) => void;
  onMount?: () => void;
  setHandleOnMessage?: (consumerID: string, handler: (event: EventStreamType) => void) => void;
};

type OutputGroupsProps = {
  children?: React.ReactNode;
  consumerID: string;
  executionOutput?: ExecutionOutputType;
  hideTimer?: boolean;
  minHeight?: number | string;
  onlyShowWithContent?: boolean;
  role?: ElementRoleEnum;
  styles?: React.CSSProperties;
} & OutputGroupsType;

const OutputGroups: React.FC<OutputGroupsProps> = ({
  children,
  consumerID,
  executionOutput,
  handleContextMenu,
  minHeight = 200,
  onMount,
  role,
  setHandleOnMessage,
  styles,
}: OutputGroupsProps) => {
  const mutants = useMutate({ resource: 'execution_outputs' });
  const theme = useContext(ThemeContext);

  const phaseRef = useRef<number>(0);
  const outputMountRef = useRef(null);
  const resultElementRefs = useRef<Record<string, React.MutableRefObject<HTMLDivElement>>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef(null);
  const timeoutScrollRef = useRef(null);
  const executionOutputMappingRef = useRef<Record<string, ExecutionOutputType>>({});
  const executingRef = useRef<boolean>(false);
  const resultRootsRef = useRef<Record<string, {
    node: Element;
    root: Root;
  }>>({});

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
            containerRect={scrollbarRef.current?.getBoundingClientRect()}
            executionOutput={xo}
            fetchOutput={fetchOutput}
            handleContextMenu={(a, b) => {
              handleContextMenu(a, b, contextMenuProps);
            }}
            ref={resultElementRefs.current[xo.uuid]}
            scrollbarRef={scrollbarRef}
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
      namespace: null,
      path: null,
      uuid,
    };

    executionOutputMappingRef.current[uuid].messages.push(result);
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

    if (statusRef?.current) {
      if (executingRef.current) {
        statusRef?.current?.classList?.remove(stylesBlockNode.fadeOut);
        statusRef.current.innerText =
          `${capitalize(STATUS_DISPLAY_TEXT[result?.status] ?? result?.status)}...`;
      } else {
        statusRef?.current?.classList?.add(stylesBlockNode.fadeOut);
        statusRef.current.innerText = '';
      }
    }
  }

  useEffect(() => {
    if (phaseRef.current === 0 && executionOutput) {
      mutants.list.mutate({
        onSuccess: ({ data }) => {
          const xos: ExecutionOutputType[] = data.execution_outputs ?? [];
          xos.forEach((xo) => {
            const { uuid } = xo;
            executionOutputMappingRef.current[uuid] = xo;
          });

          if (!(executionOutput.uuid in executionOutputMappingRef.current)) {
            executionOutputMappingRef.current[executionOutput.uuid] = executionOutput;
          }

          renderResults();

          onMount && onMount?.();
        },
        query: {
          '_order_by[]': '-timestamp',
          _format: 'with_output_statistics',
          _limit: 40,
          namespace: executionOutput?.namespace,
          path: executionOutput?.path,
        },
      });

      phaseRef.current = 1;
    }

    setHandleOnMessage(consumerID, (event: EventStreamType) => {
      const { result } = event;

      appendResultForOutput(result);
      updateExecutionStatus(result);

      renderResults({ executing: executingRef.current });

      dispatchCustomEvent(EventEnum.EVENT_STREAM_MESSAGE, {
        executionOutput: executionOutputMappingRef.current[result?.process?.message_request_uuid],
        result,
      });
    });

    const ts = timeoutRef.current;
    const tss = timeoutScrollRef.current;

    const roots = resultRootsRef.current;

    return () => {
      clearTimeout(ts)
      clearTimeout(tss)

      containerRef.current = null;
      executingRef.current = false;
      executionOutputMappingRef.current = {};
      outputMountRef.current = null;
      phaseRef.current = 0;
      resultElementRefs.current = {};
      scrollbarRef.current = null;
      statusRef.current = null;
      timeoutRef.current = null;
      timeoutScrollRef.current = null;

      Object.values(roots ?? {})?.forEach(({
        node,
        root,
      }) => {
        try {
          root?.render(null);
        } catch(error) {
          console.error(error);
        }

        setTimeout(() => {
          root?.unmount();
          node?.remove();
        }, 1);
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cancelDrag(event: any) {
    event.stopPropagation();
  }

  return (
    <div
      className={[
        stylesBlockNode.inheritDimensions,
      ].filter(Boolean).join(' ')}
      onContextMenu={e => handleContextMenu(e, null, contextMenuProps)}
      ref={containerRef}
      role={role}
      style={styles}
    >
      {children}

      <Scrollbar
        autoHorizontalPadding
        className={stylesBlockNode.outputScrollContainer}
        hideX
        onPointerDownCapture={cancelDrag}
        ref={scrollbarRef}
        showY
      >
        <Grid ref={outputMountRef} rowGap={6} paddingTop={6} paddingBottom={6} templateRows="min-content" />

        <Grid style={{ height: 20 }} paddingBottom={6}>
          <Text italic monospace muted ref={statusRef} warning xsmall />
        </Grid>
      </Scrollbar>
    </div>
  );
};

export default OutputGroups;
