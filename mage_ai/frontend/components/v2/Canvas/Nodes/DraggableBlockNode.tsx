import React from 'react';
import { areEqual, areEqualApps } from './equals';
import { NodeWrapper, NodeWrapperProps } from './NodeWrapper';
import { BlockNodeWrapper } from './BlockNodeWrapper';
import { BlockNodeWrapperProps } from './types';

const DraggableBlockNode: React.FC<BlockNodeWrapperProps & NodeWrapperProps> = props => (
  <BlockNodeWrapper Wrapper={NodeWrapper} {...props} />
);

export default React.memo(DraggableBlockNode, (p1, p2) => areEqual(p1, p2) && areEqualApps(p1, p2));
