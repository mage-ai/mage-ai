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
  const connUUID = `${connectionUUID(connection)}`;

  // Create placeholder that will be updated when the ports are mounted.
  let dValue = '';

  if (fromRect & toRect) {
    dValue = getPathD(connection, fromRect as RectType, toRect as RectType);
  }

  return (
    <path
      d={dValue}
      fill="transparent"
      id={connUUID}
      key={connectionUUID(connection)}
      stroke="black"
      strokeWidth="2"
    />
  );
});
