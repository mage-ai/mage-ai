import React, { memo, useEffect } from 'react';

import Path from '@mana/elements/Path';
import PathGradient from '@mana/elements/PathGradient';
import { ConnectionType, RectType } from '../interfaces';
import { connectionUUID, getPathD } from './utils';

type ConnectionLineProps = {
  connection: ConnectionType;
  onMount?: (uuid: string) => void;
  stop0ColorName?: string;
  stop1ColorName?: string;
};

export const ConnectionLine = memo(({
  connection,
  onMount,
  stop0ColorName,
  stop1ColorName,
}: ConnectionLineProps) => {
  const fromRect = connection?.fromItem?.rect;
  const toRect = connection?.toItem?.rect;
  const connUUID = `${connectionUUID(connection)}`;

  // Create placeholder that will be updated when the ports are mounted.
  let dValue = '';

  if (fromRect && toRect) {  // Correct "&&" instead of "&"
    dValue = getPathD(connection, fromRect as RectType, toRect as RectType);
  }

  useEffect(() => {
    if (onMount) {
      onMount?.(connUUID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (stop0ColorName && stop1ColorName)
  ? (
    <PathGradient
      d={dValue}
      id={connUUID}
      key={connUUID}
      stop0ClassNames={[
        'stop',
        'stop-opacity-100',
        `stop-color-${stop0ColorName}`,
      ]}
      stop1ClassNames={[
        'stop',
        'stop-opacity-100',
        `stop-color-${stop1ColorName}`,
      ]}
    />
  ): (
    <Path
      d={dValue}
      id={connUUID}
      key={connUUID}
    />
  );
});
