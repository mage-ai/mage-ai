import React from 'react';
import styles from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';

const CanvasContainer = (
  {
    children,
    className,
    gridSize = 40,
  }: {
    className?: string;
    children: React.ReactNode;
    gridSize?: number;
  },
  ref: React.Ref<HTMLDivElement>,
) => (
  <div
    className={[
      styles.canvas,
      className ?? '',
      gridSize ?? false ? styles[`grid-size-${gridSize}`] : '',
    ].join(' ')}
    ref={ref}
  >
    {children}
  </div>
);

export default React.forwardRef(CanvasContainer);
