import styles from '@styles/scss/elements/GradientContainer.module.scss';
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
};

const GradientContainerOutter = withStyles<OutterProps>(styles, {
  HTMLTag: 'div',
  classNames: ['gradient-outter'],
});

const GradientContainerInner = withStyles<InnerProps>(styles, {
  HTMLTag: 'div',
  classNames: ['gradient-inner'],
});

export function GradientContainer({
  backgroundColor,
  borderColors,
  children,
  className,
  direction = 'to top right',
}: OutterProps &
  InnerProps & {
    borderColors?: string[];
    className?: string;
    direction?: Direction;
  }) {
  return (
    // @ts-ignore
    <GradientContainerOutter
      className={[styles['gradient-outter'], className || ''].join(' ')}
      gradientBackground={
        direction && borderColors?.length >= 2
          ? [direction.replace(' ', '-'), ...(borderColors || [])].join('-')
          : undefined
      }
    >
      {/* @ts-ignore */}
      <GradientContainerInner backgroundColor={backgroundColor}>{children}</GradientContainerInner>
    </GradientContainerOutter>
  );
}

export default GradientContainer;
