import styles from '@styles/scss/layout/Canvas/Nodes/Node.module.scss';
import { withStyles } from '@mana/hocs/withStyles';

export const NodeStyled = withStyles(styles, {
  classNames: ['node'],
});
