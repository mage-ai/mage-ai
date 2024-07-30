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
  onContextMenu?: (event: any) => void;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
};

function ConnectionLinesBase({
  className,
  children,
  id,
  linePaths,
  style,
  zIndex,
}: ConnectionLinesProps, ref) {
  return (
    <motion.svg
      className={[className ?? styles.connectionLines]?.join(' ')}
      id={id}
      initial
      ref={ref}
      style={style ?? {
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
