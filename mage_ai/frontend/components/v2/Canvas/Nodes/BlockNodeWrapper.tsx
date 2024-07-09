import BlockNodeComponent from './BlockNode';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import EventStreamType, { ServerConnectionStatusType } from '@interfaces/EventStreamType';
import OutputNode from './CodeExecution/OutputNode';
import React from 'react';
import Tag from '@mana/components/Tag';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesButton from '@styles/scss/elements/Button/Button.module.scss';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from '../../Apps/PipelineCanvas/useAppEventsHandler';
import { AppNodeType, NodeType, OutputNodeType, PortType, RectType } from '../interfaces';
import { BlockNodeWrapperProps } from './types';
import { ClientEventType, EventOperationEnum, SubmitEventOperationType } from '@mana/shared/interfaces';
import { DEBUG } from '@components/v2/utils/debug';
import { FileType } from '../../IDE/interfaces';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import { areEqual, areEqualApps } from './equals'
import { buildOutputNode } from '@components/v2/Apps/PipelineCanvas/utils/items';
import { createPortal } from 'react-dom';
import { draggableProps } from './draggable/utils';
import { executionDone } from '@components/v2/ExecutionManager/utils';
import { formatNumberToDuration } from '@utils/string';
import { getFileCache, isStale, updateFileCache } from '../../IDE/cache';
import { isEmptyObject, selectKeys, setNested } from '@utils/hash';
import { nodeClassNames } from './utils';
import { setupDraggableHandlers, buildEvent } from './utils';
import { useCallback, useContext, useEffect, useState, useMemo, useRef } from 'react';

type BlockNodeType = BlockNodeWrapperProps;

export const BlockNodeWrapper: React.FC<BlockNodeType> = ({
  Wrapper,
  appHandlersRef,
  draggable,
  droppable,
  handlers,
  index: indexProp,
  layoutConfig,
  node,
  onMountPort,
  rect,
  submitEventOperation,
  useExecuteCode,
  useRegistration,
}: BlockNodeType) => {
  // Attributes

  const block = useMemo(() => node?.block, [node]);
  const { configuration, type, uuid } = block;

  const { activeLevel, selectedGroupsRef } = useContext(SettingsContext);
  const { outputsRef } = useContext(ModelContext);
  const selectedGroup = selectedGroupsRef?.current?.[activeLevel?.current - 1];
  const blockInSelectedGroup = useMemo(() => block?.groups?.includes(selectedGroup?.uuid), [block, selectedGroup]);
  const outputsClosedRef = useRef(null);

  const buttonBeforeRef = useRef<HTMLDivElement>(null);
  const timerStatusRef = useRef(null);
  const timeoutRef = useRef(null);
  const phaseRef = useRef(0);

  const nodeRef = useRef(null);
  const outputRef = useRef(null);
  const portElementRefs = useRef({});
  const connectionErrorRef = useRef(null);
  const connectionStatusRef = useRef<ServerConnectionStatusType>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const handleOnMessageRef = useRef<(event: EventStreamType) => void>(null);
  const [outputNodes, setOutputNodes] = useState<OutputNodeType[]>(null);

  const [portalMount, setPortalMount] = useState<HTMLElement | null>(null);

  const { file, metadata } = configuration ?? {};
  const isGroup = useMemo(() => !type || type === BlockTypeEnum.GROUP, [type]);
  const requiredGroup = isGroup && metadata?.required;
  const emptyGroup = isGroup && (node as NodeType)?.items?.length === 0;

  // console.log('render');
  // Hooks
  const {
    executeCode,
  } = useExecuteCode((block as any)?.uuid, (block as any)?.uuid);
  const { subscribe, unsubscribe } = useRegistration((block as any)?.uuid, (block as any)?.uuid);
  const consumerID = useMemo(() => [String(node.id), 'main'].join(':'), [node]);

  function updateStyles(add: boolean) {
    const func = add ? 'add' : 'remove';

    buttonBeforeRef?.current?.classList?.[func]?.(stylesButton.loading);
    nodeRef?.current?.classList?.[func]?.(styles.executing);
  }

  const { dispatchAppEvent } = useAppEventsHandler(node as any, {
    [CustomAppEventEnum.START_APP]: (event: CustomAppEvent) => {
      if (event?.detail?.node?.id === node?.id) {
        // Wait until the app subscribes, then subscribe or else race condition.
        setTimeout(() => handleSubscribe(), 1000);
      }
    },
    [CustomAppEventEnum.CLOSE_OUTPUT]: ({ detail }: CustomAppEvent) => {
      if (node.id === detail?.node?.id) {
        setOutputNodes(prev => {
          outputsClosedRef.current = prev;
          return null;
        });
        handleOnMessageRef.current = null;
        unsubscribe(consumerID);
      }
    },
    [CustomAppEventEnum.PORTAL_MOUNTED]: (event: any) => {
      const { data, operationTarget } = event.detail.event ?? {};
      if (data?.node?.id === ['output', node.id].join('-')) {
        setPortalMount(operationTarget);
        portalRef.current = operationTarget;
      }
    }
  });

  useEffect(() => {
    const level = activeLevel.current;
    const timeout = timeoutRef.current;

    if (phaseRef.current === 0) {
      timeout?.current && clearTimeout(timeout.current);
      updateStyles(false);

      if (level === node?.level && file?.path && blockInSelectedGroup) {
        appHandlersRef.current.browserItems.detail.mutate({
          id: file?.path,
          onSuccess: (resp) => {
            const itemf = resp?.data?.browser_item;
            updateFileCache({ server: itemf });

            const eventStreams = itemf?.output?.reduce(
              (acc, result) => setNested(
                acc,
                [result.process.message_request_uuid, result.result_id].join('.'),
                {
                  result,
                },
              ), {});

            if (!isEmptyObject(eventStreams)) {
              const outputNode = {
                ...buildOutputNode(node, block, {
                  uuid: (block as any)?.uuid,
                } as any),
                eventStreams,
                node,
              };
              setOutputNodes([outputNode as OutputNodeType]);
              dispatchAppEvent(CustomAppEventEnum.OUTPUT_UPDATED, {
                eventStreams,
                node,
                output: outputNode,
              });
            }
          },
          query: {
            output_namespace: 'code_executions',
          },
        });
      }

      phaseRef.current += 1;
    }

    return () => {
      if (level === node?.level) {
        unsubscribe(consumerID);
      }
      clearTimeout(timeout)
      timeoutRef.current = null;
    }
  }, [block, node, consumerID, file, blockInSelectedGroup, activeLevel,
    appHandlersRef, dispatchAppEvent, unsubscribe
  ]);

  useEffect(() => {
    if (!portalMount) {
      const element = document.getElementById(`output-${uuid}`);
      if (!element) {
        console.error('Element not found');
        return;
      }
      setPortalMount(element);
    }
  }, [portalMount, uuid]);
  const draggingHandlers = setupDraggableHandlers(handlers, node, nodeRef, block);

  // Methods

  function handleError(error: Event) {
    DEBUG.node.block && console.log('[BlockNodeWrapper] connection.error:', error);
    connectionErrorRef.current = error;
    console.error('[BlockNodeWrapper] connection.error:', error);
  }

  function handleOpen(status: ServerConnectionStatusType) {
    DEBUG.node.block && console.log('[BlockNodeWrapper] connection.status:', status);
    connectionStatusRef.current = status;
  }

  const getCode = useCallback(() => getFileCache(file?.path)?.client?.file?.content, [file]);

  function handleSubscribe() {
    subscribe(consumerID, {
      onError: handleError,
      onMessage: (event: EventStreamType) => {
        handleOnMessageRef?.current?.(event);

        if (executionDone(event)) {
          updateStyles(false);
          clearTimeout(timeoutRef.current);
        }
      },
      onOpen: handleOpen,
    });
  }

  const submitCodeExecution = useCallback((event: React.MouseEvent<HTMLElement>) => {
    handleSubscribe();

    const execute = () => {
      const message = getCode();
      const [messageRequestUUID, future] = executeCode(message, {
        output_dir: file?.path ?? null,
        source: node.id,
      }, {
        future: true, onError: () => {
          updateStyles(false);
          clearTimeout(timeoutRef.current);
        }
      });

      const outputNode = buildOutputNode(node, block, {
        message,
        message_request_uuid: messageRequestUUID,
        uuid: (block as any)?.uuid,
      });

      setOutputNodes((prev) => prev === null ? [outputNode] : prev);

      updateStyles(true);

      future();

      let loops = 0;
      const now = Number(new Date());
      const updateTimerStatus = () => {
        let diff = (Number(new Date()) - now) / 1000;
        if (loops >= 600) {
          diff = Math.round(diff);
        }

        if (timerStatusRef?.current) {
          timerStatusRef.current.innerText =
            formatNumberToDuration(diff);
        }
        loops++;
        timeoutRef.current = setTimeout(
          updateTimerStatus,
          diff <= 60 * 1000 && loops <= 60 * 10 ? 100 : 1000,
        );
      };

      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(
        updateTimerStatus,
        0,
      );
    };

    if (outputsClosedRef?.current) {
      setOutputNodes(outputsClosedRef.current);
    }

    if (getCode()?.length >= 1) {
      execute();
    } else {
      appHandlersRef.current.browserItems.detail.mutate({
        id: file.path,
        onSuccess: (data: { browser_item: FileType }) => {
          updateFileCache({ client: data?.browser_item });
          execute();
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, consumerID, node, executeCode]);

  const updateBlock = useCallback((
    event: ClientEventType | Event, key: string, value: any) => {
    submitEventOperation(
      buildEvent(
        event as any,
        EventOperationEnum.MUTATE_MODEL_BLOCK,
        node, nodeRef, block,
      ), {
      handler: (e, { blocks }) => {
        blocks.update.mutate({
          event,
          onError: () => {
            nodeRef.current.classList.remove(styles.loading);
          },
          onStart: () => {
            nodeRef.current.classList.add(styles.loading);
          },
          onSuccess: () => {
            nodeRef.current.classList.remove(styles.loading);
          },
          payload: setNested({ ...(block as any) }, key, value),
        });
      },
    });
  }, [block, node, nodeRef, submitEventOperation]);

  const onMount = useCallback((port: PortType, portRef: React.RefObject<HTMLDivElement>) => {
    if (!(port?.id in portElementRefs.current)) {
      portElementRefs.current[port?.id] = {
        port,
        portRef,
      };
      onMountPort(port, portRef);
    }
  }, [onMountPort]);

  // Components
  const sharedProps = useMemo(() => draggableProps({
    classNames: [
      node?.status && styles[node?.status],
      // styles.collapsed,
      // styles.loading,
    ],
    draggable,
    droppable,
    emptyGroup,
    node,
    requiredGroup,
  }), [draggable, droppable, requiredGroup, emptyGroup, node]);

  const blockNode = useMemo(() => (
    <BlockNodeComponent
      activeLevel={activeLevel}
      block={block}
      buttonBeforeRef={buttonBeforeRef}
      draggable={draggable}
      handlers={draggingHandlers}
      index={indexProp}
      layoutConfig={layoutConfig}
      node={node}
      nodeRef={nodeRef}
      onMount={onMount}
      submitCodeExecution={submitCodeExecution}
      submitEventOperation={submitEventOperation}
      timerStatusRef={timerStatusRef}
      updateBlock={updateBlock}
    />
  ), [
    activeLevel,
    block,
    draggable,
    draggingHandlers,
    indexProp,
    layoutConfig,
    node,
    nodeRef,
    onMount,
    submitCodeExecution,
    submitEventOperation,
    updateBlock,
  ]);

  const outputNodesMemo = useMemo(() => {
    if (activeLevel.current !== node?.level) return;

    const arr = [];
    outputNodes?.forEach((output: OutputNodeType) => {
      arr.push(
        <OutputNode
          {...draggableProps({
            classNames: [styles.nodeWrapper],
            draggable: true,
            droppable: false,
            node: output,
          })}
          handleOnMessageRef={handleOnMessageRef}
          handlers={draggingHandlers}
          key={output.id}
          node={output}
          nodeRef={outputRef}
          rect={output?.rect}
        />
      );
    });

    return arr;
  }, [node, outputNodes, draggingHandlers, handleOnMessageRef, activeLevel]);

  const runtime = useMemo(() => (
    <Tag
      className={styles['display-if-executing']}
      ref={timerStatusRef}
      statusVariant
      style={{
        left: -10,
        position: 'absolute',
        top: -10,
        zIndex: 7,
      }}
    />
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [])

  if (Wrapper) {
    return (
      <Wrapper
        // {...sharedProps}
        {...draggableProps({
          classNames: [node.status ? styles[node.status] : ''],
          draggable,
          droppable,
          emptyGroup,
          node,
          requiredGroup,
        })}
        className={[
          (sharedProps.className || []),
          // Class names reserved for the SettingsManager to determine what is visible
          // based on the selected groups.
          ...nodeClassNames(node),
        ].filter(Boolean).join(' ')}
        handlers={draggingHandlers}
        node={node}
        nodeRef={nodeRef}
        rect={rect}
      >
        {runtime}
        {blockNode}
        {portalMount && outputNodesMemo?.map(outputNode => createPortal(outputNode, portalMount))}
      </Wrapper>
    );
  }

  return (
    <div
      {...draggableProps({
        classNames: [styles.nodeWrapper], draggable: true, droppable: false, node
      })}
      ref={nodeRef}
    >
      {runtime}
      {blockNode}
    </div>
  );
};

export default React.memo(BlockNodeWrapper, (p1, p2) => areEqual(p1, p2) && areEqualApps(p1, p2));
