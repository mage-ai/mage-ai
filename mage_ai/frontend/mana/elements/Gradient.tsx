import React from 'react';
import styles from '@styles/scss/elements/GradientContainer.module.scss';
import { motion } from 'framer-motion';
import { withStyles } from '../hocs/withStyles';

type Direction =
  | 'to bottom left'
  | 'to bottom right'
  | 'to bottom'
  | 'to left'
  | 'to right'
  | 'to top left'
  | 'to top right'
  | 'to top';

type InnerProps = {
  children?: React.ReactNode;
  backgroundColor?: string;
};

type OutterProps = {
  gradientBackground?: string;
  motionProps?: any;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  role?: any;
  style?: React.CSSProperties;
};

const GradientContainerInner = withStyles<InnerProps>(styles, {
  HTMLTag: 'div',
  classNames: ['gradient-inner'],
});

export function GradientContainer(
  {
    backgroundColor,
    borderColors,
    children,
    className,
    direction = 'to top right',
    motionProps,
    noBorder,
    onContextMenu,
    role,
    variant,
    style,
  }: OutterProps &
    InnerProps & {
      borderColors?: string[];
      className?: string;
      direction?: Direction;
      noBorder?: boolean;
      variant?: 'error' | 'error-reverse';
    },
  ref: React.RefObject<HTMLDivElement>,
) {
  const noInner = noBorder || variant;

  return (
    // @ts-ignore
    <motion.div
      {...motionProps}
      className={[
        styles['gradient-outter'],
        noInner && styles['noBorder'],
        variant && styles[`variant-${variant}`],
        className || '',
        direction && borderColors?.length >= 2
          ? styles[
              `gradient-background-${direction.replace(' ', '-')}-${borderColors[0]}-${borderColors[1]}`
            ]
          : undefined,
      ].join(' ')}
      onContextMenu={onContextMenu}
      ref={ref}
      role={role}
      style={style}
    >
      {/* @ts-ignore */}
      {!noInner && (
        <GradientContainerInner backgroundColor={backgroundColor}>
          {children}
        </GradientContainerInner>
      )}
      {noInner && children}
    </motion.div>
  );
}

export default React.forwardRef(GradientContainer);
