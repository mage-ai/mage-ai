import BlockNodeComponent, { BlockNodeProps, BADGE_HEIGHT, PADDING_VERTICAL } from './BlockNode';
import { EventContext } from '../../Apps/PipelineCanvas/Events/EventContext';
import { OpenInSidekick } from '@mana/icons';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import BlockType from '@interfaces/BlockType';
import React, { useCallback, useContext, useRef } from 'react';
import { NodeType } from '../interfaces';
import { useMutate } from '@context/APIMutation';

type BlockNodeType = {
  block: BlockType;
  dragRef?: React.MutableRefObject<HTMLDivElement>;
  index?: number;
  groupSelection?: boolean;
  node: NodeType;
};

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

  const { handleContextMenu, removeContextMenu, setSelectedGroup } = useContext(EventContext);

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
      onContextMenu={(event: any) => {
        if (groupSelection) return;

        event.preventDefault();
        event.stopPropagation();
        handleContextMenu(event, [
          {
            Icon: OpenInSidekick,
            onClick: (event: any) => {
              event?.preventDefault();
              setSelectedGroup(block);
              removeContextMenu(event);
            },
            uuid: `Teleport into ${block?.name}`,
          },
        ], {
          reduceItems: (i1, i2) => i1,
        });
      }}
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

export { BADGE_HEIGHT, PADDING_VERTICAL };
