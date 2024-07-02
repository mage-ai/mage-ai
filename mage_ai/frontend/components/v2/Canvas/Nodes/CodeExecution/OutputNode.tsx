import BlockType from '@interfaces/BlockType';
import React, { useRef, useMemo } from 'react';
import styles from '@styles/scss/components/Canvas/Nodes/OutputNode.module.scss';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { CanvasNodeType } from '../interfaces';
import { NodeWrapper } from '../NodeWrapper';
import { OutputNodeType } from '../../interfaces';
import { areEqual } from '../equals';
import { draggableProps } from '../draggable/utils';
import { setupDraggableHandlers } from '../utils';

type OutputNodeProps = {
  children: React.ReactNode;
  node: OutputNodeType;
} & CanvasNodeType;

const OutputNode: React.FC<OutputNodeProps> = ({
  draggable,
  children,
  handlers,
  node,
  rect,
}: OutputNodeProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const draggingHandlers = setupDraggableHandlers(
    handlers, node, nodeRef, node.block,
  );

  const sharedProps = useMemo(() => draggableProps({
    classNames: [
      styles.outputNodeContainer,
      stylesBlockNode.ready,
      stylesBlockNode.outputContainer,
    ],
    draggable,
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
      {children}
    </NodeWrapper>
  );
}

export default React.memo(OutputNode, areEqual);
