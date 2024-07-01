import styles from '@styles/scss/components/Canvas/Nodes/OutputNode.module.scss';
import useAppEventsHandler, { CustomAppEventEnum, convertEvent } from '../../../Apps/PipelineCanvas/useAppEventsHandler';
import useDispatchMounted from '../useDispatchMounted';
import useExecutable from '../useExecutable';
import { CanvasNodeType } from '../interfaces';
import { DEBUG } from '@components/v2/utils/debug';
import { NodeWrapper } from '../NodeWrapper';
import { OutputNodeType } from '../../interfaces';
import { areEqualRects, areDraggableStylesEqual } from '../equals';
import { draggableProps } from '../draggable/utils';
import { getColorNamesFromItems } from '../utils';
import { setupDraggableHandlers } from '../utils';
import React, { useEffect, useRef, useMemo } from 'react';

const DraggableAppNode: React.FC<CanvasNodeType> = ({
  draggable,
  handlers,
  node,
  rect,
  registerConsumer,
}: CanvasNodeType) => {
  const fetchDetailCountRef = useRef(0);
  const nodeRef = useRef<HTMLDivElement>(null);
  const { block, process } = node as OutputNodeType;

  const { dispatchAppEvent } = useAppEventsHandler(node);
  const { phaseRef } = useDispatchMounted(node, nodeRef);
  const { containerRef, executeCode } = useExecutable(block?.uuid, String(node?.id), registerConsumer);

  useEffect(() => {

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const draggingHandlers = setupDraggableHandlers(
    handlers, node, nodeRef, block,
  );

  const sharedProps = useMemo(() => draggableProps({
    classNames: [styles.appNodeWrapper],
    draggable,
    item: node,
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
      <div className={[
        styles.outputNodeContainer,
      ]?.filter(Boolean)?.join((' '))}>
      </div>
    </NodeWrapper>
  );
}

function areEqual(p1: CanvasNodeType, p2: CanvasNodeType) {
  const equal = p1?.node?.id === p2?.node?.id
    && areDraggableStylesEqual(p1, p2)
    && areEqualRects({ rect: p1?.rect }, { rect: p2?.rect });

  DEBUG.codeExecution.node && console.log('DraggableAppNode.areEqual', equal, p1, p2);
  return equal;
}

export default React.memo(DraggableAppNode, areEqual);
