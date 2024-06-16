import React from 'react';
import { DragItem } from '../../../Canvas/interfaces';
import { ConnectionType, RectType } from './interfaces';
import { connectionUUID, getPathD } from './utils';

type ConnectionLinesProps = {
  connections: Record<string, ConnectionType>;
  items: Record<string, DragItem>;
};

const ConnectionLines: React.FC<ConnectionLinesProps> = ({ items, connections }) => {
  const renderConnection = (connection: ConnectionType) => {
    const fromRect = items[connection.from];
    const toRect = items[connection.to];

    if (!fromRect || !toRect) return null;

    const connUUID = `${connectionUUID(connection)}`;

    return (
      <path
        d={getPathD(connection, fromRect as RectType, toRect as RectType)}
        fill="transparent"
        id={connUUID}
        key={connectionUUID(connection)}
        stroke="black"
        strokeWidth="2"
      />
    );
  };

  return (
    <svg
      style={{
        height: '100%',
        left: 0,
        pointerEvents: 'none',
        position: 'absolute',
        top: 0,
        width: '100%',
      }}
    >
      {Object.values(connections || {}).map(renderConnection)}
    </svg>
  );
};

export default ConnectionLines;
