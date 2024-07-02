import React from 'react';
import { NodeWrapper, NodeWrapperProps } from './NodeWrapper';
import { BlockNodeWrapper, areEqual } from './BlockNodeWrapper';
import { BlockNodeWrapperProps } from './types';

const DraggableBlockNode: React.FC<BlockNodeWrapperProps & NodeWrapperProps> = (props) =>
  <BlockNodeWrapper Wrapper={NodeWrapper} {...props} />

export default React.memo(DraggableBlockNode, areEqual);
