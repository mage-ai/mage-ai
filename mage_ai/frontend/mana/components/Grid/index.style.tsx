import styles from '@styles/scss/components/Grid/Grid.module.scss';
import { withStyles } from '@mana/hocs/withStyles';

export const Styled = withStyles<{
  id?: string;
}>(styles, {
  classNames: ['grid'],
});
