import React from 'react';
import { useDrag } from 'react-dnd';

import { NodeStyled } from './index.style';

type NodeProps = {
  id: number;
  left: number;
  top: number;
  children: React.ReactNode;
  onStartConnect: (e: React.MouseEvent, id: number) => void;
  onEndConnect: (e: React.MouseEvent, id: number) => void;
};

export const Node: React.FC<NodeProps> = React.memo(
  ({ id, left, top, children, onStartConnect, onEndConnect }: NodeProps) => {
    const [{ isDragging }, drag] = useDrag({
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
      item: { id, left, top },
      type: 'NODE',
    });

    const nodeStyle: React.CSSProperties = {
      left,
      opacity: isDragging ? 0.5 : 1,
      top,
    };

    return (
      <div
        onMouseDown={(event: React.MouseEvent) => onStartConnect(event, id)}
        onMouseUp={(event: React.MouseEvent) => onEndConnect(event, id)}
        ref={drag}
      >
        <NodeStyled style={nodeStyle}>
          <svg height="50" width="100">
            <foreignObject height="50" width="100">
              <div>{children}</div>
            </foreignObject>
          </svg>
        </NodeStyled>
      </div>
    );
  },
);
