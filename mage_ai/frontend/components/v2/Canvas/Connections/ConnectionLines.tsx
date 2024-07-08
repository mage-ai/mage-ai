import React from 'react';
import styles from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { motion } from 'framer-motion';

export type LinePathType = {
  id: string;
  key: string;
  paths: React.ReactNode[];
};

type ConnectionLinesProps = {
  linePaths?: Record<string, LinePathType>;
  id?: string;
  zIndex?: number;
};

const LinesComponent: React.FC<ConnectionLinesProps> = ({
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
      pointerEvents: 'none',
      position: 'absolute',
      top: 0,
      width: '100%',
      zIndex,
    }}
  >
    {Object.values(linePaths ?? {})?.flatMap(({ paths }) => paths)}
  </motion.svg>
);

function areEqual(prevProps, nextProps) {
  const keys1 = Object.values(prevProps?.linePaths ?? {})?.map(({ key }) => key).sort()?.join('--');
  const keys2 = Object.values(nextProps?.linePaths ?? {})?.map(({ key }) => key).sort()?.join('--');

  // console.log(
  //   ['keys1', keys1],
  //   ['keys2', keys2],
  //   keys1 === keys2,
  // );

  return (
    prevProps.zIndex === nextProps.zIndex &&
    prevProps.id === nextProps.id &&
    keys1 === keys2
  );
}

export const ConnectionLines = React.memo(LinesComponent, areEqual);
