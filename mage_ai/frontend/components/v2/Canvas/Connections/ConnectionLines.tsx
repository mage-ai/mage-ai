import React from 'react';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { motion } from 'framer-motion';

type ConnectionLinesProps = {
  children?: React.ReactNode;
  id?: string;
};

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  children,
  id,
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
    }}
  >
    {children}
  </motion.svg>
);
