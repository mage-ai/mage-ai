import React, { useRef } from 'react';
import styles from '@styles/scss/components/Canvas/Nodes/DraggableAppNode.module.scss';
import { DraggableWrapper, DraggableWrapperProps } from '../DraggableWrapper';
import { AppNodeType } from '../../interfaces';
import useAppEventsHandler, { CustomAppEvent } from '../../../PipelineCanvas/useAppEventsHandler';

type DraggableAppNodeProps = {
  node: AppNodeType;
};

const DraggableAppNode: React.FC<DraggableAppNodeProps> = ({
  node,
}: DraggableAppNodeProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  const { dispatchAppEvent } = useAppEventsHandler({
    node,
  } as AppManagerType, {
    [CustomAppEventEnum.START_APP]: handleStartApp,
  });

  return (
    <DraggableWrapper
      className={styles.appNode}
      node={node}
      nodeRef={nodeRef}
    >
      <div >

      </div >
    </DraggableWrapper>
  );
}

function areEqual(p1: DraggableAppNodeProps, p2: DraggableAppNodeProps) {
  const equal = p1?.node?.id === p2?.node?.id;
  return equal;
}

export default React.memo(DraggableAppNode, areEqual);
