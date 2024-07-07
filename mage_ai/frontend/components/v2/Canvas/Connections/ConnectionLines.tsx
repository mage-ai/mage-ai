import React from 'react';
import styles from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { motion } from 'framer-motion';

type ConnectionLinesProps = {
  children?: React.ReactNode;
  id?: string;
  zIndex?: number;
};

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  children,
  id,
  zIndex,
}: ConnectionLinesProps) => (
  <motion.svg
    className={[styles.connectionLines]?.join(' ')}
    id={id}
    initial
    style={{
      height: '100%',
      left: 0,
      pointerEvents: 'none',
      position: 'absolute',
      top: 0,
      width: '100%',
      zIndex,
    }}
  >
    {children}
  </motion.svg>
);
