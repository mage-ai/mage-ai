import OutputGroups from './OutputGroups';
import React, { useMemo } from 'react';
import stylesOutput from '@styles/scss/components/Canvas/Nodes/OutputNode.module.scss';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { CanvasNodeType } from '../interfaces';
import { NodeWrapper } from '../NodeWrapper';
import { OutputNodeType } from '../../interfaces';
import { areEqual } from '../equals';
import { draggableProps } from '../draggable/utils';
import { setupDraggableHandlers } from '../utils';

type OutputNodeProps = {
  node: OutputNodeType;
  nodeRef: React.RefObject<HTMLDivElement>;
  onMount?: () => void;
  source?: string;
  useRegistration: (channel: string, stream: string) => { subscribe: (consumer: string, opts?: any) => void };
} & CanvasNodeType;

const OutputNode: React.FC<OutputNodeProps> = ({
  draggable,
  handlers,
  node,
  nodeRef,
  onMount,
  rect,
  source,
  useRegistration,
}: OutputNodeProps) => {
  const block = node.block;

  const draggingHandlers = setupDraggableHandlers(handlers, node, nodeRef, block);

  const sharedProps = useMemo(() => draggableProps({
    classNames: [
      stylesOutput.outputNodeContainer,
      styles.outputContainer,
      styles.ready,
    ],
    draggable,
    excludeClassNames: [
      styles.container,
    ],
    node,
  }), [draggable, node]);

  return (
    <NodeWrapper
      {...sharedProps}
      handlers={draggingHandlers}
      node={node}
      nodeRef={nodeRef}
      rect={rect}
    >
      <OutputGroups
        block={block}
        node={node}
        onMount={onMount}
        source={source}
        useRegistration={useRegistration}
      />
    </NodeWrapper>
  );
}

export default React.memo(OutputNode, areEqual);
