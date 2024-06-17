import styles from '@styles/scss/elements/Circle.module.scss';
import { withStyles } from '../hocs/withStyles';

const Circle = withStyles<{
  size?: number;
  backgroundColor?: string;
}>(styles, {
  HTMLTag: 'div',
  classNames: ['circle'],
});

export default Circle;
