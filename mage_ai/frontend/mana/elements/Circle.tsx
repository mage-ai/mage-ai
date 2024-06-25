import styles from '@styles/scss/elements/Circle.module.scss';
import { withStyles } from '../hocs/withStyles';

type CircleProps = {
  backgroundColor?: string;
  borderColor?: string;
  border?: string;
  size?: number;
};

const Circle = withStyles<CircleProps>(styles, {
  HTMLTag: 'div',
  classNames: ['circle'],
});

function CircleComponent({ border, ...rest }: CircleProps) {
  return <Circle style={{ border }} {...rest} />;
}
export default CircleComponent;
