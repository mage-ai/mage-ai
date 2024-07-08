import OutputGroups from './OutputGroups';
import React, { useMemo } from 'react';
import stylesOutput from '@styles/scss/components/Canvas/Nodes/OutputNode.module.scss';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { CanvasNodeType } from '../interfaces';
import { getStyles, NodeWrapper } from '../NodeWrapper';
import { OutputNodeType } from '../../interfaces';
import { areEqual } from '../equals';
import { draggableProps } from '../draggable/utils';
import { nodeClassNames, setupDraggableHandlers } from '../utils';
import { useDrag } from 'react-dnd';
import useDispatchMounted from '../useDispatchMounted';
import { DEBUG } from '@components/v2/utils/debug';
import { selectKeys } from '@utils/hash';

type OutputNodeProps = {
  node: OutputNodeType;
  nodeRef: React.RefObject<HTMLDivElement>;
  source?: string;
  useRegistration: (channel: string, stream: string) => { subscribe: (consumer: string, opts?: any) => void };
} & CanvasNodeType;

const OutputNode: React.FC<OutputNodeProps> = ({
  draggable,
  handlers,
  node,
  nodeRef,
  rect,
  source,
  useRegistration,
}: OutputNodeProps) => {
  const block = node.block;

  const [{ isDragging }, connectDrag] = useDrag(() => ({
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    item: node,
    type: node.type,
  }), [node]);

  const draggingHandlers = setupDraggableHandlers(handlers, node, nodeRef, block);

  const sharedProps = useMemo(() => draggableProps({
    classNames: [
      stylesOutput.outputNodeContainer,
      styles.ready,
    ],
    draggable,
    excludeClassNames: [
      styles.container,
    ],
    node,
  }), [draggable, node]);

  useDispatchMounted(node, nodeRef, {
    onMount: () => {
      DEBUG.codeExecution.node && console.log('OutputNode mounted:', node);
    }
  });

  return (
    <NodeWrapper
      {...sharedProps}
      className={[
        (sharedProps.className || []),
        // Class names reserved for the SettingsManager to determine what is visible
        // based on the selected groups.
        ...nodeClassNames(node),
      ].filter(Boolean).join(' ')}
      connectDrag={connectDrag}
      handlers={draggingHandlers}
      node={node}
      nodeRef={nodeRef}
      rect={rect}
    >
      <OutputGroups
        block={block}
        node={node}
        source={source}
        styles={selectKeys(getStyles(node, {
          draggable,
          isDragging,
          rect,
        }), ['height', 'opacity'])}
        useRegistration={useRegistration}
      />
    </NodeWrapper>
  );
}

export default React.memo(OutputNode, areEqual);
