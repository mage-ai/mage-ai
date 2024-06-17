import React from 'react';

type ConnectionLinesProps = {
  children: React.ReactNode;
};

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  children,
}: ConnectionLinesProps) => (
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
    {children}
  </svg>
);
