import type { CSSProperties, FC } from 'react';
import type { XYCoord } from 'react-dnd';
import { useDragLayer } from 'react-dnd';

import { ItemTypeEnum } from '../types';
import { NodeItemType } from '../interfaces';
import { snapToGrid as snapToGridFunc } from '../utils/snapToGrid';

export interface CustomDragLayerProps {
  gridDimensions?: { height: number; width: number };
  onDragging?: (opts?: {
    clientOffset: XYCoord;
    currentOffset: XYCoord;
    differenceFromInitialOffset: XYCoord;
    initialClientOffset: XYCoord;
    initialOffset: XYCoord;
    item: NodeItemType;
    itemType: ItemTypeEnum;
  }) => void;
  snapToGrid: boolean;
}

const layerStyles: CSSProperties = {
  height: '100%',
  left: 0,
  pointerEvents: 'none',
  position: 'fixed',
  top: 0,
  width: '100%',
  zIndex: 100,
};

function getItemStyles(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null,
  handleSnapToGrid?: (xy: XYCoord) => [number, number],
) {
  if (!initialOffset || !currentOffset) {
    return {
      display: 'none',
    };
  }

  let { x, y } = currentOffset;

  if (handleSnapToGrid) {
    x -= initialOffset.x;
    y -= initialOffset.y;
    [x, y] = handleSnapToGrid?.({ x, y });
    x += initialOffset.x;
    y += initialOffset.y;
  }

  const transform = `translate(${x}px, ${y}px)`;
  return {
    WebkitTransform: transform,
    transform,
  };
}

export const DragLayer: FC<CustomDragLayerProps> = ({
  gridDimensions,
  onDragging,
  snapToGrid,
}: CustomDragLayerProps) => {
  const {
    clientOffset,
    currentOffset,
    differenceFromInitialOffset,
    initialClientOffset,
    initialOffset,
    isDragging,
    item,
    itemType,
  } = useDragLayer(monitor => ({
    // Pointer positions:
    // client offset of the pointer at the time when the current drag operation has started
    initialClientOffset: monitor.getInitialClientOffset(),
    // client offset of the pointer while a drag operation is in progress
    clientOffset: monitor.getClientOffset(),
    // difference between the last recorded client offset of the pointer and
    // the client offset when the current drag operation has started
    differenceFromInitialOffset: monitor.getDifferenceFromInitialOffset(),
    // client offset of the drag source component's root DOM node,
    // based on its position at the time when the current drag operation has started,
    // and the movement difference.
    currentOffset: monitor.getSourceClientOffset(),
    // client offset of the drag source component's root DOM node at the time
    // when the current drag operation has started
    initialOffset: monitor.getInitialSourceClientOffset(),
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
  }));

  onDragging &&
    onDragging?.({
      clientOffset,
      currentOffset,
      differenceFromInitialOffset,
      initialClientOffset,
      initialOffset,
      item,
      itemType: itemType as ItemTypeEnum,
    });

  function renderItem() {
    switch (itemType) {
      case ItemTypeEnum.BLOCK:
        return null;
      default:
        return null;
    }
  }

  if (!isDragging) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div
        style={getItemStyles(
          initialOffset,
          currentOffset,
          snapToGrid ? xy => snapToGridFunc(xy, gridDimensions) : null,
        )}
      >
        {renderItem()}
      </div>
    </div>
  );
};
