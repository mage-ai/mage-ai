import type { CSSProperties, FC } from 'react';
import { memo, useMemo, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { ItemTypeEnum } from '../types';

const style: CSSProperties = {
  border: '1px dashed gray',
  padding: '0.5rem 1rem',
  marginBottom: '.5rem',
  backgroundColor: 'white',
  cursor: 'move',
};

export interface CardProps {
  id: any;
  text: string;
  moveCard: (draggedId: string, id: string) => void;
}

const CardNode: FC<CardProps> = memo(function Card({ id, text, moveCard }) {
  const ref = useRef(null);
  const [{ isDragging, handlerId }, connectDrag] = useDrag({
    type: ItemTypeEnum.CARD,
    item: { id },
    collect: monitor => {
      const result = {
        handlerId: monitor.getHandlerId(),
        isDragging: monitor.isDragging(),
      };
      return result;
    },
  });

  const [, connectDrop] = useDrop({
    accept: ItemTypeEnum.CARD,
    hover({ id: draggedId }: { id: string; type: string }) {
      if (draggedId !== id) {
        moveCard(draggedId, id);
      }
    },
  });

  connectDrag(ref);
  connectDrop(ref);
  const opacity = isDragging ? 0 : 1;
  const containerStyle = useMemo(() => ({ ...style, opacity }), [opacity]);
  return (
    <div data-handler-id={handlerId} ref={ref} style={containerStyle}>
      {text}
    </div>
  );
});

export default CardNode;
