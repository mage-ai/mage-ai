import styles from '@styles/scss/elements/Circle.module.scss';
import { withStyles } from '../hocs/withStyles';

const Circle = withStyles<{
  backgroundColor?: string;
  borderColor?: string;
  border?: string;
  size?: number;
}>(styles, {
  HTMLTag: 'div',
  classNames: ['circle'],
});

function CircleComponent({ border, ...rest }) {
  return <Circle style={{ border }} {...rest} />;
}
export default CircleComponent;
