import React from 'react';

type DividerProps = {
  compact?: boolean;
  short?: boolean;
  vertical?: boolean;
};

function Divider({ compact, short, vertical }: DividerProps) {
  return (
    <div
      className={`
        ${styles.divider}
        ${short && !vertical ? styles.short : ''}
        ${!short && !vertical ? styles.full : ''}
        ${vertical ? styles.vertical : ''}
        ${compact ? styles.compact : ''}
      `}
    />
  );
}

export default Divider;
