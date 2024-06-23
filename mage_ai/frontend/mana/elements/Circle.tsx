import styles from '@styles/scss/elements/Circle.module.scss';
import { withStyles } from '../hocs/withStyles';

const Circle = withStyles<{
  backgroundColor?: string;
  borderColor?: string;
  size?: number;
}>(styles, {
  HTMLTag: 'div',
  classNames: ['circle'],
});

export default Circle;
