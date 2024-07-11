import BlockNodeComponent, { BlockNodeProps } from './BlockNode';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import BlockType from '@interfaces/BlockType';
import React, { useCallback, useRef } from 'react';
import { NodeType } from '../interfaces';
import { RectType } from '@mana/shared/interfaces';

type BlockNodeType = {
  block: BlockType;
  dragRef?: React.MutableRefObject<HTMLDivElement>;
  index?: number;
  node: NodeType;
} & BlockNodeProps;

function BlockNode({
  block,
  dragRef,
  node,
  groupSelection,
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
        groupSelection && stylesBlockNode.groupSelection,
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
        groupSelection={groupSelection}
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
  return p1.block.uuid === p2.block.uuid
    && p1?.groupSelection === p2?.groupSelection;
}

export default React.memo(React.forwardRef(BlockNode), areEqual);
