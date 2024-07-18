import OutputGroups, { OutputGroupsType } from './OutputGroups';
import React, { useMemo } from 'react';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
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
import { CustomAppEventEnum } from '@components/v2/Apps/PipelineCanvas/enums';
import { CustomAppEvent } from '@components/v2/Apps/PipelineCanvas/useAppEventsHandler';

type OutputNodeProps = {
  className?: string;
  node: OutputNodeType;
  nodeRef: React.RefObject<HTMLDivElement>;
} & CanvasNodeType &
  OutputGroupsType;

const OutputNode: React.FC<OutputNodeProps> = ({
  className,
  draggable,
  handlers,
  node,
  nodeRef,
  rect,
  ...props
}: OutputNodeProps) => {
  const block = node.block;

  const [{ isDragging }, connectDrag] = useDrag(
    () => ({
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
      item: node,
      type: node.type,
    }),
    [node],
  );

  const draggingHandlers = setupDraggableHandlers(handlers, node, nodeRef, block);

  const sharedProps = useMemo(
    () =>
      draggableProps({
        classNames: [],
        draggable,
        excludeClassNames: [styles.container],
        node,
      }),
    [draggable, node],
  );

  useDispatchMounted(node, nodeRef);

  return (
    <NodeWrapper
      {...sharedProps}
      className={[
        className,
        sharedProps.className || [],
        // Class names reserved for the SettingsManager to determine what is visible
        // based on the selected groups.
        ...nodeClassNames(node),
      ]
        .filter(Boolean)
        .join(' ')}
      connectDrag={connectDrag}
      handlers={draggingHandlers}
      node={node}
      nodeRef={nodeRef}
      rect={rect}
    >
      <OutputGroups
        {...props}
        node={node}
        styles={selectKeys(
          getStyles(node, {
            draggable,
            isDragging,
            rect,
          }),
          ['height', 'opacity'],
        )}
      />
    </NodeWrapper>
  );
};

export default React.memo(OutputNode, areEqual);
