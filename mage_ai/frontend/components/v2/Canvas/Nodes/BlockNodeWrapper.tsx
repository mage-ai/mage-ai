import { BlockNode } from './BlockNode';
import { NodeWrapper, NodeWrapperProps } from './NodeWrapper';
import { getBlockColor } from '@mana/themes/blocks';

export function BlockNodeWrapper(wrapperProps: NodeWrapperProps) {
  const block = wrapperProps?.item?.block;
  if (!block) {
    return null;
  }

  return (
    <NodeWrapper {...wrapperProps}>
      <BlockNode
        borderConfig={{
          borders: [
            {
              color: getBlockColor(block?.type)?.accent,
            },
          ],
        }}
      />
    </NodeWrapper>
  );
}
