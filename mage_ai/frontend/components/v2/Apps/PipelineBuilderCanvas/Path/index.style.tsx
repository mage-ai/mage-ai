import styles from '@styles/scss/layout/Canvas/Paths/ConnectionsPath.module.scss';
import { withStyles } from '@mana/hocs/withStyles';

export const ConnectionsPathStyled = withStyles(styles, {
  HTMLTag: 'svg',
  classNames: ['connections-path'],
});
