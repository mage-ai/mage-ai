import OutputNode from './CodeExecution/OutputNode';
import { areEqual, areEqualApps } from './equals'
import PipelineType from '@interfaces/PipelineType';
import React from 'react';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import update from 'immutability-helper';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from '../../Apps/PipelineCanvas/useAppEventsHandler';
import useDispatchMounted from './useDispatchMounted';
import useExecutable from './useExecutable';
import useOutputManager, { OutputManagerProps, OutputManagerType } from './CodeExecution/useOutputManager';
import { BlockNode } from './BlockNode';
import { ClientEventType, EventOperationEnum, SubmitEventOperationType } from '@mana/shared/interfaces';
import { ConfigurationType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { DEBUG } from '@components/v2/utils/debug';
import { FileType } from '../../IDE/interfaces';
import { ItemTypeEnum } from '../types';
import { NodeItemType, NodeType, PortType, RectType } from '../interfaces';
import { StatusTypeEnum, BlockTypeEnum } from '@interfaces/BlockType';
import { areEqualRects, areDraggableStylesEqual } from './equals';
import { createPortal } from 'react-dom';
import { draggableProps } from './draggable/utils';
import { getFileCache, isStale, updateFileCache } from '../../IDE/cache';
import { handleClickGroupMenu } from './utils';
import { onSuccess } from '@api/cleaner/utils/response';
import { setNested } from '@utils/hash';
import { ServerConnectionStatusType } from '@interfaces/EventStreamType';
import { setupDraggableHandlers, buildEvent } from './utils';
import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { WithOnMount } from '@mana/hooks/useWithOnMount';
export const BlockNodeWrapper: React.FC<any> = ({
  Wrapper,
  appHandlersRef,
  draggable,
  droppable,
  handlers,
  node,
  onMountPort,
  rect,
  registerConsumer,
  submitEventOperation,
}) => {
  const nodeRef = useRef(null);
  const portElementRefs = useRef({});

  const [connectionStatus, setConnectionStatus] = useState<ServerConnectionStatusType | null>(null);
  const [portalMount, setPortalMount] = useState<HTMLElement | null>(null);

  // Attributes

  const block = useMemo(() => node?.block, [node]);
  const { configuration, type, uuid } = block;
  const { file, metadata } = configuration ?? {};
  const isGroup = useMemo(() => !type || type === BlockTypeEnum.GROUP, [type]);
  const requiredGroup = isGroup && metadata?.required;
  const emptyGroup = isGroup && (node as NodeType)?.items?.length === 0;

  // Hooks
  useDispatchMounted(node, nodeRef, {
    onMount: () => {
      const element = document.getElementById(`output-${uuid}`);
      if (!element) {
        console.error('Element not found');
        return;
      }

      setPortalMount(element);
    },
  });
  const draggingHandlers = setupDraggableHandlers(handlers, node, nodeRef, block);
  const { connect, containerRef, executeCode } = useExecutable(uuid, node.id, registerConsumer, {
    onError: handleError,
    onOpen: handleOpen,
  })

  // Methods

  function handleError(error: Event) {
    console.error(error);
    DEBUG.node.block && console.log('[BlockNodeWrapper] connection.error:', error);
  }

  function handleOpen(status: ServerConnectionStatusType) {
    setConnectionStatus(status);
    DEBUG.node.block && console.log('[BlockNodeWrapper] connection.status:', status);
  }

  const getCode = useCallback(() => getFileCache(file?.path)?.client?.file?.content, [file]);

  const submitCodeExecution = useCallback((_event: React.MouseEvent<HTMLElement>) => {
    if (getCode()?.length >= 1) {
      executeCode(getCode());
    } else {
      appHandlersRef.current.browserItems.detail.mutate({
        id: file.path,
        onSuccess: (data: { browser_item: FileType }) => {
          updateFileCache({ client: data?.browser_item });
          executeCode(getCode());
          nodeRef.current.classList.add(styles.codeExecuted);
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
    <BlockNode
      block={block}
      draggable={draggable}
      handlers={draggingHandlers}
      node={node}
      nodeRef={nodeRef}
      onMount={onMount}
      submitCodeExecution={submitCodeExecution}
      submitEventOperation={submitEventOperation}
      updateBlock={updateBlock}
    />
  ), [
    block,
    draggable,
    draggingHandlers,
    node,
    nodeRef,
    onMount,
    submitCodeExecution,
    submitEventOperation,
    updateBlock,
  ]);

  const outputNode = useMemo(() => (
    <OutputNode
      {...sharedProps}
      handlers={draggingHandlers}
      node={node}
      rect={{
        height: rect.height,
        left: rect.left,
        top: rect.top + rect.width,
        width: rect.width,
      }}
    >
      <WithOnMount
        onMount={connect}
      >
        <div ref={containerRef} />
      </WithOnMount>
    </OutputNode>
  ), [containerRef, connect, sharedProps, draggingHandlers, node, rect]);

  if (Wrapper) {
    return (
      <Wrapper
        {...sharedProps}
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
