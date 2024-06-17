import update from 'immutability-helper';
import { CSSProperties, FC, useRef } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';

import { DraggableBlock } from '../Draggable/DraggableBlock';
import type { DragItem } from '../interfaces';
import { ItemTypeEnum } from '../types';
import { snapToGrid as doSnapToGrid } from '../utils/snapToGrid';
import { ColorEnum } from '../types';
import GroupNode from '../Nodes/GroupNode';
import BoxNode from '../Nodes/BoxNode';
import TargetBox from '../Targets/TargetBox';
import NestedTargetBox from '../Targets/NestedTargetBox';

const styles: CSSProperties = {
  width: 300,
  height: 300,
  border: '1px solid black',
  position: 'relative',
};

export interface BoxContainerProps {
  snapToGrid: boolean;
}

interface BoxMap {
  [key: string]: { top: number; left: number; title: string };
}

export const BoxContainer: FC<BoxContainerProps> = ({ snapToGrid }) => {
  console.log('BoxContainer render');
  // const activeItemRef = useRef(null);
  // const [canDropDelayed, setCanDropDelayed] = useState(false);

  const [boxes, setBoxes] = useState<BoxMap>({
    a: { top: 20, left: 80, title: 'Drag me around' },
    b: { top: 180, left: 20, title: 'Drag me too' },
  });

  const moveBox = useCallback(
    (id: string, left: number, top: number) => {
      setBoxes(
        update(boxes, {
          [id]: {
            $merge: { left, top },
          },
        }),
      );
    },
    [boxes],
  );

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ItemTypeEnum.BLOCK,
      drop(item: DragItem, monitor) {
        // console.log('canDropDelayed', canDropDelayed);
        // if (!canDropDelayed) {
        //   return;
        // }
        const delta = monitor.getDifferenceFromInitialOffset() as {
          x: number;
          y: number;
        };

        let left = Math.round(item.left + delta.x);
        let top = Math.round(item.top + delta.y);
        if (snapToGrid) {
          [left, top] = doSnapToGrid(left, top);
        }

        moveBox(item.id, left, top);
        return undefined;
      },
      // canDrop: ({ id }) => {
      //   console.log(activeItemRef?.current?.id, id);
      //   return activeItemRef?.current?.id !== id;
      // },
      // collect: monitor => ({
      //   isOver: monitor.isOver(),
      //   canDrop: monitor.canDrop(),
      // }),
    }),
    [moveBox],
  );

  // console.log('canDrop',  canDrop, canDropDelayed);
  //   useEffect(() => {
  //     setTimeout(() => setCanDropDelayed(canDrop), 0); // or setTimeout(, 0) without polyfill
  //   }, [canDrop]);

  return (
    <>
      <div ref={drop} style={styles}>
        {Object.keys(boxes).map(key => (
          <DraggableBlock
            // activeItemRef={activeItemRef}
            id={key}
            key={key}
            // showCopyIcon
            {...(boxes[key] as { top: number; left: number; title: string })}
          />
        ))}
      </div>

      <div style={{ overflow: 'hidden', clear: 'both', margin: '-.5rem' }}>
        <div style={{ float: 'left' }}>
          <GroupNode color={ColorEnum.BLUE}>
            <GroupNode color={ColorEnum.YELLOW}>
              <GroupNode color={ColorEnum.YELLOW} />
              <GroupNode color={ColorEnum.BLUE} />
            </GroupNode>
            <GroupNode color={ColorEnum.BLUE}>
              <GroupNode color={ColorEnum.YELLOW} />
            </GroupNode>
          </GroupNode>
        </div>

        <div style={{ float: 'left', marginLeft: '5rem', marginTop: '.5rem' }}>
          <TargetBox />
        </div>
      </div>

      <div>
        <div style={{ overflow: 'hidden', clear: 'both', margin: '-1rem' }}>
          <NestedTargetBox greedy={true}>
            <NestedTargetBox greedy={true}>
              <NestedTargetBox greedy={true} />
            </NestedTargetBox>
          </NestedTargetBox>
          <NestedTargetBox>
            <NestedTargetBox>
              <NestedTargetBox />
            </NestedTargetBox>
          </NestedTargetBox>
        </div>

        <div style={{ overflow: 'hidden', clear: 'both', marginTop: '1.5rem' }}>
          <BoxNode showCopyIcon />
        </div>
      </div>
    </>
  );
};
