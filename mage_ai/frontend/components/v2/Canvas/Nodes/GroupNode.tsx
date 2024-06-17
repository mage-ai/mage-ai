import type { CSSProperties, FC, ReactNode } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import type { DragSourceMonitor } from 'react-dnd';
import { useDrag } from 'react-dnd';

import { ColorEnum } from '../types';

const style: CSSProperties = {
  border: '1px dashed gray',
  padding: '0.5rem',
  margin: '0.5rem',
};

export interface SourceBoxProps {
  color: string;
  onToggleForbidDrag?: () => void;
  children?: ReactNode;
}

const GroupNode: FC<SourceBoxProps> = memo(function SourceBox({ color, children }) {
  const [forbidDrag, setForbidDrag] = useState(false);
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: color,
      canDrag: !forbidDrag,
      collect: (monitor: DragSourceMonitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [forbidDrag, color],
  );

  const onToggleForbidDrag = useCallback(() => {
    setForbidDrag(!forbidDrag);
  }, [forbidDrag, setForbidDrag]);

  const backgroundColor = useMemo(() => {
    switch (color) {
      case ColorEnum.YELLOW:
        return 'lightgoldenrodyellow';
      case ColorEnum.BLUE:
        return 'lightblue';
      default:
        return 'lightgoldenrodyellow';
    }
  }, [color]);

  const containerStyle = useMemo(
    () => ({
      ...style,
      backgroundColor,
      opacity: isDragging ? 0.4 : 1,
      cursor: forbidDrag ? 'default' : 'move',
    }),
    [isDragging, forbidDrag, backgroundColor],
  );

  return (
    <div data-color={color} ref={drag} role='SourceBox' style={containerStyle}>
      <input checked={forbidDrag} onChange={onToggleForbidDrag} type='checkbox' />
      <small>Forbid drag</small>
      {children}
    </div>
  );
});

export default GroupNode;
