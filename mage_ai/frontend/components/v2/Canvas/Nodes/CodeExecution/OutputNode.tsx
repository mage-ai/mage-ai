import styles from '@styles/scss/components/Canvas/Nodes/OutputNode.module.scss';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import Grid from '@mana/components/Grid';
import useAppEventsHandler, { CustomAppEventEnum, CustomAppEvent, SubscriptionsType, convertEvent } from '../../../Apps/PipelineCanvas/useAppEventsHandler';
import useDispatchMounted from '../useDispatchMounted';
import useExecutable from '../useExecutable';
import { getFileCache, isStale, updateFileCache } from '../../../IDE/cache';
import { CanvasNodeType } from '../interfaces';
import { DEBUG } from '@components/v2/utils/debug';
import { NodeWrapper } from '../NodeWrapper';
import { OutputNodeType } from '../../interfaces';
import { areEqualRects, areDraggableStylesEqual } from '../equals';
import { draggableProps } from '../draggable/utils';
import { getColorNamesFromItems } from '../utils';
import { setupDraggableHandlers } from '../utils';
import React, { useEffect, useRef, useMemo } from 'react';

const OutputNode: React.FC<CanvasNodeType> = ({
  draggable,
  handlers,
  node,
  rect,
  registerConsumer,
}: CanvasNodeType) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const { block, process } = node as OutputNodeType;
  const file = block?.configuration?.file;
  const nodeID = String(node?.id);

  const { containerRef, executeCode } = useExecutable(process.uuid, nodeID, registerConsumer, {
    autoConnect: true,
  });

  function getCode() {
    console.log(node, block, getFileCache(file?.path))
    return getFileCache(file?.path)?.client?.file?.content ?? '';
  }

  useDispatchMounted(node, nodeRef, {
    eventType: [CustomAppEventEnum.NODE_MOUNTED, nodeID].join('.'),
    onMount: () => {
      if (!nodeRef?.current) return;
      executeCode(getCode());
    },
  });

  const subscriptions = {
    [nodeID as CustomAppEventEnum]: () => {
      executeCode(getCode());
    },
  } as SubscriptionsType;
  useAppEventsHandler(node, subscriptions);

  const draggingHandlers = setupDraggableHandlers(
    handlers, node, nodeRef, block,
  );

  const sharedProps = useMemo(() => draggableProps({
    classNames: [styles.outputNodeContainer, stylesBlockNode.ready],
    draggable,
    node,
  }), [draggable, node]);

  const colorNames = getColorNamesFromItems([node]);

  return (
    <NodeWrapper
      {...sharedProps}
      handlers={draggingHandlers}
      node={node}
      nodeRef={nodeRef}
      rect={rect}
    >
      <div ref={containerRef} />
    </NodeWrapper>
  );
}

function areEqual(p1: CanvasNodeType, p2: CanvasNodeType) {
  const equal = p1?.node?.id === p2?.node?.id
    && areDraggableStylesEqual(p1, p2)
    && areEqualRects({ rect: p1?.rect }, { rect: p2?.rect });

  DEBUG.codeExecution.node && console.log('OutputNode.areEqual', equal, p1, p2);
  return equal;
}

export default React.memo(OutputNode, areEqual);
