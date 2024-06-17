import type { CSSProperties, FC } from 'react';
import type { XYCoord } from 'react-dnd';
import { useDragLayer } from 'react-dnd';

import { BoxDragPreview } from '../Draggable/Preview/BlockDragPreview';
import { ItemTypeEnum } from '../types';
import { snapToGrid } from '../utils/snapToGrid';

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
  isSnapToGrid: boolean,
) {
  if (!initialOffset || !currentOffset) {
    return {
      display: 'none',
    };
  }

  let { x, y } = currentOffset;

  if (isSnapToGrid) {
    x -= initialOffset.x;
    y -= initialOffset.y;
    [x, y] = snapToGrid({ x, y });
    x += initialOffset.x;
    y += initialOffset.y;
  }

  const transform = `translate(${x}px, ${y}px)`;
  return {
    WebkitTransform: transform,
    transform,
  };
}

export interface CustomDragLayerProps {
  snapToGrid: boolean;
}

export const DragLayer: FC<CustomDragLayerProps> = props => {
  const { itemType, isDragging, item, initialOffset, currentOffset } = useDragLayer(monitor => ({
    currentOffset: monitor.getSourceClientOffset(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
  }));

  function renderItem() {
    switch (itemType) {
      case ItemTypeEnum.BLOCK:
        return <BoxDragPreview title={item.title} />;
      default:
        return null;
    }
  }

  if (!isDragging) {
    return null;
  }
  return (
    <div style={layerStyles}>
      <div style={getItemStyles(initialOffset, currentOffset, props.snapToGrid)}>
        {renderItem()}
      </div>
    </div>
  );
};
