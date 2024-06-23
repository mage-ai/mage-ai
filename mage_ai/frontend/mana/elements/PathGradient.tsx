import React from 'react';
import styles from '@styles/scss/elements/PathGradient.module.scss';
import { withStyles } from '../hocs/withStyles';

const PathGradient = withStyles<{
  d?: string;
  id?: string;
}>(styles, {
  HTMLTag: 'svg',
  allowDynamicStyles: true,
  classNames: ['svg'],
});

const PathGradientComponent = React.forwardRef<
  SVGSVGElement,
  {
    className?: string;
    d?: string;
    id?: string;
    stop0ClassNames?: string[];
    stop1ClassNames?: string[];
  } & React.HTMLAttributes<SVGPathElement>
>(({ className, d, id, stop0ClassNames = [], stop1ClassNames = [], ...rest }, ref) => {
  const getJoinedClassNames = (classNames: string[]) => classNames.map(cn => styles[cn]).join(' ');

  return (
    <PathGradient className={className} ref={ref}>
      <defs>
        <linearGradient id={`${id}-grad`} x1="0%" x2="100%" y1="0%" y2="0%">
          {stop0ClassNames.length > 0 && (
            <stop
              className={getJoinedClassNames(stop0ClassNames)}
              id={`${id}-stop-0`}
              offset="0%"
            />
          )}
          {stop1ClassNames.length > 0 && (
            <stop
              className={getJoinedClassNames(stop1ClassNames)}
              id={`${id}-stop-1`}
              offset="100%"
            />
          )}
        </linearGradient>
      </defs>
      <path d={d} fill="none" id={id} stroke={`url(#${id}-grad)`} {...rest} />
    </PathGradient>
  );
});

export default PathGradientComponent;
