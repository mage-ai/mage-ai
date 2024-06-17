import styles from '@styles/scss/elements/GradientContainer.module.scss';
import { withStyles } from '../hocs/withStyles';


type Direction = 'to bottom left'
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
  borderColors = ['white', 'purple'],
  children,
  direction = 'to top right',
}: OutterProps & InnerProps & {
  borderColors?: string[],
  direction?: Direction,
}) {
  return (
    // @ts-ignore
    <GradientContainerOutter
      gradientBackground={[
        direction.replace(' ', '-'),
        ...(borderColors || []),
      ].join('-')}
    >
      {/* @ts-ignore */}
      <GradientContainerInner backgroundColor={backgroundColor}>
        {children}
      </GradientContainerInner>
    </GradientContainerOutter>
  );
}

export default GradientContainer;
