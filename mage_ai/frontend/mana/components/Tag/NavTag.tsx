import styles from '@styles/scss/components/Tag/NavTag.module.scss';
import { withStyles } from '../../hocs/withStyles';

const NavTag = withStyles<{
  children: React.ReactNode;
}>(styles, {
  HTMLTag: 'div',
  classNames: ['nav-tag'],
});

export default NavTag;
