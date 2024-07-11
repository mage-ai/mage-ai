import BlockNodeComponent, { BlockNodeProps } from './BlockNode';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import BlockType from '@interfaces/BlockType';
import React, { useCallback, useRef } from 'react';
import { NodeType } from '../interfaces';
import { RectType } from '@mana/shared/interfaces';

type BlockNodeType = {
  block: BlockType;
  dragRef?: React.MutableRefObject<HTMLDivElement>;
  draggable?: boolean;
  index?: number;
  node: NodeType;
  rectRef: React.MutableRefObject<RectType>;
} & BlockNodeProps;

function BlockNode({
  block,
  dragRef,
  node,
  draggable,
  droppable,
  droppableItemTypes,
  eventHandlers,
  handleDrop,
  rectRef,
  ...rest
}: BlockNodeType, ref: React.MutableRefObject<HTMLElement>) {
  // Controls
  const buttonBeforeRef = useRef<HTMLDivElement>(null);
  const timerStatusRef = useRef(null);

  // Methods
  const submitCodeExecution = useCallback((event: React.MouseEvent<HTMLElement>) => {

  }, []);
  const updateBlock = useCallback(() => {

  }, []);

  return (
    <div
      className={[
        stylesBlockNode.blockNodeWrapper,
      ].filter(Boolean).join(' ')}
      ref={ref as React.RefObject<HTMLDivElement>}
    >
      <BlockNodeComponent
        {...rest}
        // activeLevel={activeLevel}
        block={block}
        buttonBeforeRef={buttonBeforeRef}
        // handlers={draggingHandlers}
        // index={indexProp}
        dragRef={dragRef}
        node={node}
        submitCodeExecution={submitCodeExecution}
        // submitEventOperation={submitEventOperation}
        timerStatusRef={timerStatusRef}
        updateBlock={updateBlock}
      />
    </div>
  );
}

function areEqual(p1: BlockNodeType, p2: BlockNodeType) {
  return p1.block.uuid === p2.block.uuid;
}

export default React.memo(React.forwardRef(BlockNode), areEqual);
