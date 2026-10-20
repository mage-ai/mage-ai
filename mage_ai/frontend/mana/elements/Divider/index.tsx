import React from 'react';
import styles from '@styles/scss/components/Divider/Divider.module.scss';

type DividerProps = {
  compact?: boolean;
  short?: boolean;
  vertical?: boolean;
};

function Divider({ compact, short, vertical }: DividerProps) {
  return (
    <div
      className={[
        styles.divider,
        short && !vertical ? styles.short : '',
        !short && !vertical ? styles.full : '',
        vertical ? styles.vertical : '',
        compact ? styles.compact : '',
      ].join(' ')}
    />
  );
}

export default Divider;
