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
  linePaths?: Record<string, LinePathType[]>;
  id?: string;
  zIndex?: number;
};

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  id,
  linePaths,
  zIndex,
}: ConnectionLinesProps) => (
  <motion.svg
    className={[styles.connectionLines]?.join(' ')}
    id={id}
    initial
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
  </motion.svg>
);
