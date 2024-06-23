import type { CSSProperties, FC } from 'react';
import type { XYCoord } from 'react-dnd';
import { useDragLayer } from 'react-dnd';

import { BoxDragPreview } from '../Draggable/Preview/BlockDragPreview';
import { ItemTypeEnum } from '../types';
import { NodeItemType } from '../interfaces';
import { snapToGrid as snapToGridFunc } from '../utils/snapToGrid';

export interface CustomDragLayerProps {
  gridDimensions?: { height: number; width: number };
  onDragging?: (opts?: {
    currentOffset: XYCoord;
    initialOffset: XYCoord;
    itemType: ItemTypeEnum;
    item: NodeItemType;
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
  const { currentOffset, initialOffset, isDragging, item, itemType } = useDragLayer(monitor => ({
    currentOffset: monitor.getSourceClientOffset(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
  }));

  onDragging &&
    onDragging?.({
      currentOffset,
      initialOffset,
      item,
      itemType: itemType as ItemTypeEnum,
    });

  function renderItem() {
    switch (itemType) {
      case ItemTypeEnum.BLOCK:
        return null;
      // return <BoxDragPreview title={item.title} />;
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
