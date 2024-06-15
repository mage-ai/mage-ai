import React, { useCallback, CSSProperties } from 'react';
import { useDrag } from 'react-dnd';

import { NodeTypeEnum } from '../types';

type NodeProps = {
  children: React.ReactNode;
  className?: string;
  id: number;
  left: number;
  onEndConnect: (e: React.MouseEvent, id: number) => void;
  onStartConnect: (e: React.MouseEvent, id: number) => void;
  style?: CSSProperties;
  top: number;
};

const Node: React.FC<NodeProps> = React.memo(({
  children,
  className,
  id,
  left,
  onEndConnect,
  onStartConnect,
  style,
  top,
}: NodeProps) => {
  const [{ isDragging, opacity }, dragRef] = useDrag({
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    item: { id, left, top },
    type: NodeTypeEnum.BLOCK,
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => onStartConnect(e, id), [onStartConnect, id]);
  const handleMouseUp = useCallback((e: React.MouseEvent) => onEndConnect(e, id), [onEndConnect, id]);

  // Dynamic styles for the node
  // const nodeStyle: CSSProperties = {
  //   cursor: 'move',
  //   left,
  //   opacity: isDragging ? 0.5 : 1, // Reduce opacity when dragging
  //   position: 'absolute',
  //   top,
  // };

  return (
    <div
      className="node"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      ref={dragRef}
      style={{
        opacity,
      }}
    >
      <svg height="50" width="100">
        <foreignObject height="50" width="100">
          <div xmlns="http://www.w3.org/1999/xhtml">
            {children}
          </div>
        </foreignObject>
      </svg>
    </div>
  );
});

export default Node;
