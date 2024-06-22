import React from 'react';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';

type ConnectionLinesProps = {
  children?: React.ReactNode;
  id?: string;
};

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  children,
  id,
}: ConnectionLinesProps) => (
  <svg
    className={[
      styles.connectionLines,
    ]?.join(' ')}
    id={id}
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
