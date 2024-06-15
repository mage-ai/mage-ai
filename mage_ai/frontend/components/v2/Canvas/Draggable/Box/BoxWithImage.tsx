import type { CSSProperties, FC } from 'react';
import { useState } from 'react';
import { DragPreviewImage, useDrag } from 'react-dnd';

import { boxImage } from './images/boxImage';
import { ItemTypeEnum } from '../../types';


const style: CSSProperties = {
  border: '1px dashed gray',
  padding: '0.5rem 1rem',
  marginBottom: '.5rem',
  cursor: 'move',
  width: '20rem',
};

export const BoxWithImage: FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [{ opacity, backgroundColor }, drag, preview] = useDrag(() => ({
    type: ItemTypeEnum.BOX,
    collect: (monitor) => ({
      opacity: monitor.isDragging() ? 0.4 : 1,
      backgroundColor: monitor.isDragging() ? 'red' : 'white',
    }),
    item: () => {
      setIsDragging(true);
      return { id: 1 };
    },
    // end: (item, monitor) => {
    //   setIsDragging(false);
    //   if (monitor.didDrop()) {
    //     console.log('Drag ended successfully');
    //   } else {
    //     console.log('Drag ended but not dropped');
    //   }
    // },
  }));

  return (
    <>
      <DragPreviewImage connect={preview} key={new Date().getTime()} src={boxImage} />
      <div ref={drag} style={{ ...style, opacity, backgroundColor }}>
        Drag me to see an image
      </div>
    </>
  );
};
