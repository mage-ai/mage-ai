import { CSSProperties, FC, useEffect } from 'react';
import { useState, useRef } from 'react';
import { DragPreviewImage, useDrag } from 'react-dnd';

import { boxImage } from './images/boxImage';
import { ItemTypeEnum } from '../../types';

const style: CSSProperties = {
  border: '1px dashed gray',
  padding: '0.5rem 1rem',
  marginBottom: '.5rem',
  backgroundColor: 'white',
  width: '20rem',
};

const handleStyle: CSSProperties = {
  backgroundColor: 'green',
  cursor: 'move',
  display: 'inline-block',
  height: '1rem',
  marginRight: '0.75rem',
  width: '1rem',
};

// export const BoxWithHandle: FC = () => {
//   const [{ opacity }, drag, preview] = useDrag(() => ({
//     type: ItemTypeEnum.BOX,
//     collect: (monitor) => ({
//       opacity: monitor.isDragging() ? 0.4 : 1,
//     }),
//     item: () => ({ id: 1 }),
//   }));

//   return (
//     <div key={`handle-container-${new Date().getTime()}`} ref={preview} style={{ ...style, opacity }}>
//       <div key={`handle-${new Date().getTime()}`} ref={drag} style={handleStyle} />
//       Drag me by the handle
//     </div>
//   );
// };

export const BoxWithHandle: FC = () => {
  const initRef = useRef(null);
  const dragCountRef = useRef(0);
  const [key, setKey] = useState(null);
  const [{ opacity, backgroundColor }, drag, preview] = useDrag(() => ({
    type: ItemTypeEnum.BOX,
    collect: monitor => ({
      opacity: monitor.isDragging() ? 0.4 : 1,
      backgroundColor: monitor.isDragging() ? 'red' : 'white',
    }),
    item: () => {
      // setIsDragging(true);
      dragCountRef.current += 1;
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

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      setKey(`handle-container-${new Date().getTime()}`);
    }
  }, []);

  return (
    <>
      {/* <DragPreviewImage connect={preview} key={new Date().getTime()} src={boxImage} />
      <div ref={drag} style={{ ...style, opacity, backgroundColor }}>
        Drag me to see an image
      </div> */}

      <div
        key={dragCountRef.current === 0 ? key : `handle-container-${new Date().getTime()}`}
        ref={preview}
        style={{ ...style, opacity }}
      >
        <div ref={drag} style={handleStyle} />
        Drag me by the handle Key: {`handle-container-${new Date().getTime()}`}
      </div>
    </>
  );
};
