import OutputNode from './CodeExecution/OutputNode';
import { formatNumberToDuration } from '@utils/string';
import { motion } from 'framer-motion';
import { getNewUUID } from '@utils/string';
import { areEqual, areEqualApps } from './equals'
import PipelineType from '@interfaces/PipelineType';
import React from 'react';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesButton from '@styles/scss/elements/Button/Button.module.scss';
import stylesOutput from '@styles/scss/components/Canvas/Nodes/OutputNode.module.scss';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import update from 'immutability-helper';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from '../../Apps/PipelineCanvas/useAppEventsHandler';
import useOutputManager, { OutputManagerType } from './CodeExecution/useOutputManager';
import BlockNodeComponent from './BlockNode';
import { ClientEventType, EventOperationEnum, SubmitEventOperationType } from '@mana/shared/interfaces';
import { ConfigurationType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { DEBUG } from '@components/v2/utils/debug';
import { FileType } from '../../IDE/interfaces';
import { NodeType, PortType, RectType } from '../interfaces';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { createPortal } from 'react-dom';
import { draggableProps } from './draggable/utils';
import { getFileCache, isStale, updateFileCache } from '../../IDE/cache';
import { setNested } from '@utils/hash';
import EventStreamType, { ServerConnectionStatusType } from '@interfaces/EventStreamType';
import { setupDraggableHandlers, buildEvent } from './utils';
import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { BlockNodeWrapperProps } from './types';
import { executionDone } from '@components/v2/ExecutionManager/utils';
import { nodeClassNames } from './utils';

type BlockNodeType = {

} & BlockNodeWrapperProps;

export const BlockNodeWrapper: React.FC<BlockNodeType> = ({
  Wrapper,
  activeLevel,
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
  const buttonBeforeRef = useRef<HTMLDivElement>(null);
  const timerStatusRef = useRef(null);
  const timeoutRef = useRef(null);

  const nodeRef = useRef(null);
  const outputRef = useRef(null);
  const portElementRefs = useRef({});
  const connectionErrorRef = useRef(null);
  const connectionStatusRef = useRef<ServerConnectionStatusType>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [portalMount, setPortalMount] = useState<HTMLElement | null>(null);

  // Attributes

  const block = useMemo(() => node?.block, [node]);
  const { configuration, type, uuid } = block;
  const { file, metadata } = configuration ?? {};
  const isGroup = useMemo(() => !type || type === BlockTypeEnum.GROUP, [type]);
  const requiredGroup = isGroup && metadata?.required;
  const emptyGroup = isGroup && (node as NodeType)?.items?.length === 0;

  // console.log('render');
  // Hooks
  const {
    executeCode,
  } = useExecuteCode(undefined, block.uuid);
  const { subscribe, unsubscribe } = useRegistration(undefined, block.uuid);

  function updateStyles(add: boolean) {
    const func = add ? 'add' : 'remove';

    buttonBeforeRef?.current?.classList?.[func]?.(stylesButton.loading);
    nodeRef?.current?.classList?.[func]?.(styles.executing);
  }

  useAppEventsHandler(node, {
    [CustomAppEventEnum.PORTAL_MOUNTED]: (event: any) => {
      const { data, operationTarget } = event.detail.event ?? {};
      if (data?.node?.id === ['output', node.id].join('-')) {
        setPortalMount(operationTarget);
        portalRef.current = operationTarget;
      }
    }
  });

  useEffect(() => {
    const timeout = timeoutRef.current;
    clearTimeout(timeout);
    updateStyles(false);

    const level = activeLevel.current;
    return () => {
      level === node?.level && unsubscribe(node.id);
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, unsubscribe]);

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

  const submitCodeExecution = useCallback((_event: React.MouseEvent<HTMLElement>) => {
    subscribe(node.id, {
      onError: handleError,
      onMessage: (event: EventStreamType) => {
        if (executionDone(event)) {
          updateStyles(false);
          clearTimeout(timeoutRef.current);
        }
      },
      onOpen: handleOpen,
    });

    const execute = () => {
      executeCode(getCode(), {
        source: node.id,
      });
      updateStyles(true);
      // Add this and don’t take it away unless closing.
      outputRef?.current?.classList?.add?.(stylesOutput.executed);

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
      updateTimerStatus();
    };

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
  }, [block, executeCode]);

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
          payload: setNested({ ...block }, key, value),
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
      node?.outputs?.length >= 1 ? styles.codeExecuted : '',
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

  const outputNode = useMemo(() => {
    if (activeLevel.current !== node?.level) return;
    const outputRect = {
      height: (rect.height ?? 0),
      left: (rect.left ?? 0),
      top: (rect.top ?? 0) + (rect.height ?? 0),
      width: (rect.width ?? 0),
    };
    outputRect.width * 2;
    outputRect.left -= (outputRect.width - rect.width) / 2;

    return (
      <OutputNode
        {...sharedProps}
        handlers={draggingHandlers}
        node={node}
        nodeRef={outputRef}
        rect={outputRect}
        source="block-node"
        useRegistration={useRegistration}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, sharedProps, draggingHandlers]);

  if (Wrapper) {
    return (
      <Wrapper
        {...sharedProps}
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
        {blockNode}
        {portalMount && createPortal(outputNode, portalMount)}
      </Wrapper>
    );
  }

  return <div {...sharedProps} ref={nodeRef}>{blockNode}</div>;
};

export default React.memo(BlockNodeWrapper, (p1, p2) => areEqual(p1, p2) && areEqualApps(p1, p2));
