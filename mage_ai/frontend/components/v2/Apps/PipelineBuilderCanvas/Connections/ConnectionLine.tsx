import React, { memo } from 'react';

import { RectType } from '../../../Canvas/interfaces';
import { ConnectionType } from './interfaces';
import { connectionUUID, getPathD } from './utils';

type ConnectionLineProps = {
  connection: ConnectionType;
};

export const ConnectionLine = memo(({ connection }: ConnectionLineProps) => {
  const fromRect = connection?.fromItem?.rect;
  const toRect = connection?.toItem?.rect;

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
});
