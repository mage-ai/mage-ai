import BlockNodeComponent, { BlockNodeProps, BADGE_HEIGHT, PADDING_VERTICAL } from './BlockNode';
import { EventContext } from '../../Apps/PipelineCanvas/Events/EventContext';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { OpenInSidekick, Trash } from '@mana/icons';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import React, { useCallback, useContext, useMemo, useRef } from 'react';
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
  const { name, type } = block;

  // APIs
  const { mutations } = useContext(ModelContext);

  // Attributes
  const isGroup =
    useMemo(() => !type || [BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(type), [type]);

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
        if (groupSelection || event.metaKey) return;

        event.preventDefault();
        event.stopPropagation();

        const items = [];

        if (isGroup) {
          items.push({
            Icon: OpenInSidekick,
            onClick: (event: any) => {
              event?.preventDefault();
              setSelectedGroup(block);
              removeContextMenu(event);
            },
            uuid: `Teleport into ${block?.name}`,
          });
        } else {
          items.push({
            Icon: Trash,
            onClick: (event: any) => {
              event?.preventDefault();

              mutations.pipelines.update.mutate({
                event,
                onSuccess: () => {
                  removeContextMenu(event);
                },
                payload: (pipeline) => ({
                  ...pipeline,
                  blocks: pipeline?.blocks?.filter((b: BlockType) => b.uuid !== block.uuid),
                }),
              });
            },
            uuid: `Remove ${name} from pipeline`,
          });
        }

        handleContextMenu(event, items, {
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
