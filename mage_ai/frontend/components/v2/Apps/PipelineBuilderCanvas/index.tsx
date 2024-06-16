import update from 'immutability-helper';
import { useCallback, useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';

import Layout from '../../Canvas/Layout';
import { CanvasStyled } from './index.style';
import { Canvas } from '../../Canvas';
import { snapToGrid as doSnapToGrid } from '../../Canvas/utils/snapToGrid';
import { DragItem } from '../../Canvas/interfaces';
import { ItemTypeEnum } from '../../Canvas/types';
import { DraggableBlock } from '../../Canvas/Draggable/DraggableBlock';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { randomNameGenerator, randomSimpleHashGenerator } from '@utils/string';

type PipelineBuilderProps = {
  snapToGridOnDrag?: boolean;
};

function PipelineBuilder({
  snapToGridOnDrag = false,
}: PipelineBuilderProps) {
  const [boxes, setBoxes] = useState<Record<string, DragItem>>({
    a: { top: 20, left: 80, title: 'Drag me around' },
    b: { top: 180, left: 20, title: 'Drag me too' },
  });

  const moveBox = useCallback(
    (box: DragItem) => {
      setBoxes(
        update(boxes, {
          [box.id]: {
            $merge: box,
          },
        }),
      );
    },
    [boxes],
  );
  const addBox = useCallback(
    (box: DragItem) => {
      setBoxes(
        update(boxes, {
          [box.id]: {
            $set: box,
          },
        }),
      );
    },
    [boxes],
  );

  const [opts, drop] = useDrop(
    () => ({
      accept: ItemTypeEnum.BLOCK,
      drop(item: DragItem, monitor) {
        console.log('MOVE');
        const delta = monitor.getDifferenceFromInitialOffset() as {
          x: number
          y: number
        };

        const left = Math.round(item.left + delta.x);
        const top = Math.round(item.top + delta.y);
        // snapToGridOnDrag ? [left, top] = doSnapToGrid(left, top) : null;

        moveBox({ ...item, left, top });

        return undefined;
      },
    }),
    [moveBox],
  );

  console.log(opts);

  return (
    <>
      <CanvasStyled
        onDoubleClick={(event: React.MouseEvent) => addBox({
          id: randomSimpleHashGenerator(),
          left: event.clientX,
          title: randomNameGenerator(),
          top: event.clientY,
        })}
        ref={drop}
      >
        {Object.keys(boxes).map((key) => (
          <DraggableBlock
            id={key}
            key={key}
            {...(boxes[key] as DragItem)}
          />
        ))}
      </CanvasStyled>
    </>
  );
}
export default function PipelineBuilderCanvas({
  snapToGridOnDrop = false,
  ...props
}: PipelineBuilderProps & { snapToGridOnDrop?: boolean }) {

  return (
    <Canvas>
      {/* <Layout /> */}
      <PipelineBuilder {...props} />
      <DragLayer snapToGrid={snapToGridOnDrop} />
    </Canvas>
  );
}
