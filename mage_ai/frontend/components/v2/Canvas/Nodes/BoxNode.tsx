import type { FC } from 'react';
import { useDrag } from 'react-dnd';

import { ItemTypeEnum } from '../types';

const style = {
  display: 'inline-block',
  border: '1px dashed gray',
  padding: '0.5rem 1rem',
  backgroundColor: 'white',
  cursor: 'move',
};

const BoxNode: FC = ({ showCopyIcon }) => {
  const [, drag] = useDrag(() => ({
    type: ItemTypeEnum.BOX,
    options: {
      dropEffect: showCopyIcon ? 'copy' : 'move',
    },
  }));
  return (
    <div ref={drag} style={style}>
      Drag me
    </div>
  );
};

export default BoxNode;
