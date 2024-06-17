import React from 'react';
import { useCallback, useState } from 'react';

import { BoxContainer } from './Containers/BoxContainer';
import ListContainerWrapper from './Containers/List/ListContainerWrapper';
import { FilesContainer } from './Containers/Files/FilesContainer';
import { BoxContainerTyped } from './Containers/BoxContainerTyped';
import { DragLayer } from './Layers/DragLayer';
import { BoxWithHandle } from './Draggable/Box/BoxWithHandle';
import { BoxWithImage } from './Draggable/Box/BoxWithImage';

function Layout(props, ref: Ref.HTMLCanvasElement) {
  const [snapToGridAfterDrop, setSnapToGridAfterDrop] = useState(false);
  const [snapToGridWhileDragging, setSnapToGridWhileDragging] = useState(false);

  const handleSnapToGridAfterDropChange = useCallback(() => {
    setSnapToGridAfterDrop(!snapToGridAfterDrop);
  }, [snapToGridAfterDrop]);

  const handleSnapToGridWhileDraggingChange = useCallback(() => {
    setSnapToGridWhileDragging(!snapToGridWhileDragging);
  }, [snapToGridWhileDragging]);

  console.log('Layout render');

  return (
    <div>
      <BoxContainerTyped />
      <FilesContainer />
      <div>
        <div style={{ marginTop: '1.5rem' }}>
          <BoxWithHandle />
          <BoxWithImage />
        </div>
      </div>
      <BoxContainer snapToGrid={snapToGridAfterDrop} />
      <DragLayer snapToGrid={snapToGridWhileDragging} />

      <p>
        <label htmlFor='snapToGridWhileDragging'>
          <input
            checked={snapToGridWhileDragging}
            id='snapToGridWhileDragging'
            onChange={handleSnapToGridWhileDraggingChange}
            type='checkbox'
          />
          <small>Snap to grid while dragging</small>
        </label>
        <br />
        <label htmlFor='snapToGridAfterDrop'>
          <input
            checked={snapToGridAfterDrop}
            id='snapToGridAfterDrop'
            onChange={handleSnapToGridAfterDropChange}
            type='checkbox'
          />
          <small>Snap to grid after drop</small>
        </label>
      </p>

      <ListContainerWrapper />
    </div>
  );
}

export default React.forwardRef(Layout);
