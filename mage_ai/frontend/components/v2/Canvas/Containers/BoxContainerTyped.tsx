import update from 'immutability-helper';
import shuffle from 'lodash/shuffle';
import type { FC } from 'react';
import { memo, useCallback, useEffect, useState } from 'react';
import { NativeTypes } from 'react-dnd-html5-backend';

import { BoxNodeTyped } from '../Nodes/BoxNodeTyped';
import { TargetBoxTyped } from '../Targets/TargetBoxTyped';
import { ItemTypeEnum } from '../types';

export interface SourceBox {
  name: string;
  type: string;
}

export interface TargetBoxTyped {
  accepts: string[];
  lastDroppedItem: any;
}

export interface ContainerState {
  boxes: SourceBox[];
  targetBoxes: TargetBoxTyped[];
  droppedBoxNames: string[];
}

export const BoxContainerTyped: FC = memo(function BoxContainerTyped() {
  console.log('BoxContainerTyped render');
  const [targetBoxes, setTargetBoxes] = useState<TargetBoxTyped[]>([
    { accepts: [ItemTypeEnum.GLASS], lastDroppedItem: null },
    { accepts: [ItemTypeEnum.FOOD], lastDroppedItem: null },
    {
      accepts: [ItemTypeEnum.PAPER, ItemTypeEnum.GLASS, NativeTypes.URL],
      lastDroppedItem: null,
    },
    { accepts: [ItemTypeEnum.PAPER, NativeTypes.FILE], lastDroppedItem: null },
  ]);
  const [boxes] = useState<SourceBox[]>([
    { name: 'Bottle', type: ItemTypeEnum.GLASS },
    { name: 'Banana', type: ItemTypeEnum.FOOD },
    { name: 'Magazine', type: ItemTypeEnum.PAPER },
  ]);
  const [droppedBoxNames, setDroppedBoxNames] = useState<string[]>([]);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setBoxes(shuffle(boxes));
  //     setTargetBoxes(shuffle(targetBoxes));
  //   }, 4000);
  //   return () => clearInterval(interval);
  // });

  const isDropped = (boxName: string) => droppedBoxNames.indexOf(boxName) > -1;

  const handleDrop = useCallback(
    (index: number, item: { name: string }) => {
      const { name } = item;
      setTargetBoxes(
        update(targetBoxes, {
          [index]: {
            lastDroppedItem: {
              $set: item,
            },
          },
        }),
      );
      setDroppedBoxNames(
        update(
          droppedBoxNames,
          name
            ? {
                $push: [name],
              }
            : {},
        ),
      );
    },
    [targetBoxes, droppedBoxNames],
  );

  return (
    <div>
      <div style={{ overflow: 'hidden', clear: 'both' }}>
        {targetBoxes.map(({ accepts, lastDroppedItem }, index) => (
          <TargetBoxTyped
            accepts={accepts}
            key={index}
            lastDroppedItem={lastDroppedItem}
            onDrop={item => handleDrop(index, item)}
          />
        ))}
      </div>

      <div style={{ overflow: 'hidden', clear: 'both' }}>
        {boxes.map(({ name, type }, index) => (
          <BoxNodeTyped isDropped={isDropped(name)} key={index} name={name} type={type} />
        ))}
      </div>
    </div>
  );
});
