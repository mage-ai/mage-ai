import React from 'react';
import { NodeWrapper, NodeWrapperProps } from './NodeWrapper';
import { BlockNodeWrapper, BlockNodeWrapperProps, areEqual } from './BlockNodeWrapper';

const DraggableBlockNode: React.FC<BlockNodeWrapperProps & NodeWrapperProps> = (props) =>
  <BlockNodeWrapper Wrapper={NodeWrapper} {...props} />

export default React.memo(DraggableBlockNode, areEqual);
