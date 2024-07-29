import React from 'react';
import styles from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { motion } from 'framer-motion';
import { RectType } from '@mana/shared/interfaces';

export function linePathKey(linePaths: Record<string, LinePathType>): string {
  const arr = Object.values(linePaths ?? {})?.map(lp => lp.key);
  return arr.filter(Boolean).sort().join('--');
}

export type LinePathType = {
  animate?: boolean;
  defs?: any[];
  id: string;
  key: string;
  paths: React.ReactNode[];
  source?: RectType;
  target?: RectType;
};

type ConnectionLinesProps = {
  children?: React.ReactNode;
  linePaths?: Record<string, LinePathType[]>;
  id?: string;
  zIndex?: number;
};

function ConnectionLinesBase({
  children,
  id,
  linePaths,
  zIndex,
}: ConnectionLinesProps, ref) {
  return (
    <motion.svg
      className={[styles.connectionLines]?.join(' ')}
      id={id}
      initial
      ref={ref}
      style={{
        height: '100%',
        left: 0,
        overflow: 'visible',
        pointerEvents: 'none',
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex,
      }}
    >
      {Object.values(linePaths ?? {})?.flatMap(lps => lps.flatMap(p => p.paths ?? []))}
      {children}
    </motion.svg>
  );
}

export const ConnectionLines = React.forwardRef(ConnectionLinesBase);
