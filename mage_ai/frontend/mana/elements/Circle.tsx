import styles from '@styles/scss/elements/Circle.module.scss';
import { motion } from 'framer-motion';
import { withStyles } from '../hocs/withStyles';

type CircleProps = {
  className?: string;
  backgroundColor?: string;
  borderColor?: string;
  border?: string;
  hoverBorderColor?: boolean;
  hoverBackgroundColor?: boolean;
  motion?: any;
  size?: number;
};

const Circle = withStyles<CircleProps>(styles, {
  HTMLTag: 'div',
  classNames: ['circle'],
});

function CircleComponent({ border, hoverBackgroundColor, hoverBorderColor, motion: motionProps, ...rest }: CircleProps) {
  return (
    <motion.div {...motionProps}>
      <Circle
        style={{ border }}
        {...rest}
        className={[
          rest.className,
          styles.circle,
          hoverBorderColor && styles.hoverBorderColor,
          hoverBackgroundColor && styles.hoverBackgroundColor,
        ].filter(Boolean).join(' ')}
      />
    </motion.div>
  );
}

export default CircleComponent;
